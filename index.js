const express = require('express')
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');




var admin = require("firebase-admin");
var serviceAccount = require("./super-firebase-adminKey.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});





//middleware
app.use(cors());
app.use(express.json());




const verifyFireToken = async (req, res, next) => {
    console.log(req.headers.authorization);
    if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' })
    }
    const token = req.headers.authorization.split(' ')[1];
    if (!token) {
        return res.status(401).send({ message: 'unauthorized access' })
    }


    // verify token
    // first go to firebase sdk than install firebase-admin than follow down code?

    try {
        const userInfo = await admin.auth().verifyIdToken(token);
        req.token_email = userInfo.email;
        console.log(userInfo);
        next();
    }
    catch {
        return res.status(401).send({ message: 'unauthorized access' });
    }

};








const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@test1.mnnsraa.mongodb.net/?appName=test1`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});







app.get('/', (req, res) => {
    res.send('Hello World supers!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})




async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const myDB = client.db("super_db");
        const jobsCollection = myDB.collection("jobs");
        const acceptedTasksCollection = myDB.collection('acceptedTasks');





        app.get('/latestjobs', async (req, res) => {
            const cursor = jobsCollection.find().sort({ _id: -1 }).limit(8)
            const result = await cursor.toArray();
            res.send(result);
        });

        app.post('/jobs', verifyFireToken, async (req, res) => {
            const newJob = req.body;
            // Ensure postedDate is Date type
            newJob.postedDate = new Date(newJob.postedDate);

            const result = await jobsCollection.insertOne(newJob);
            res.send(result);
        });



        // all jobs
        app.get('/alljobs', async (req, res) => {
            const cursor = jobsCollection.find().sort({ postedDate: -1 });
            const result = await cursor.toArray();
            res.send(result);
        });


        app.get('/alljobs/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const query = { _id: new ObjectId(id) }
            const result = await jobsCollection.findOne(query)
            res.send(result);
        });










        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {

        //   await client.close();
    }
}
run().catch(console.dir);