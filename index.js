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

        // filter my user login email
        app.get('/myaddjobs', verifyFireToken, async (req, res) => {
            const email = req.query.email;
            // console.log(email);

            const query = {};
            if (email) {
                if (email !== req.token_email) {
                    return res.status(403).send({ message: 'forbidden access' });
                }
                query.userEmail = email;
            }

            const cursor = jobsCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })


     //  Update a job by ID
     app.put('/myaddjobs/:id', verifyFireToken, async (req, res) => {
        const id = req.params.id;
        const updatedJob = req.body;
        const email = req.query.email;

        if (email !== req.token_email) {
            return res.status(403).send({ message: 'forbidden access' });
        }

        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
            $set: {
                title: updatedJob.title,
                summary: updatedJob.summary,
                category: updatedJob.category,
                coverImage: updatedJob.coverImage,
                postedDate: new Date(),
            }
        };

        const result = await jobsCollection.updateOne(filter, updateDoc);
        res.send(result);
    });



    app.delete('/myaddjobs/:id', verifyFireToken, async (req, res) => {
        const id = req.params.id;
        try {
            const query = { _id: new ObjectId(id) };
            const result = await jobsCollection.deleteOne(query);
            res.send(result);
        } catch (e) {
            return res.status(400).send({ message: "Invalid Post ID format" });
        }
    });


   // new
   app.get('/updatejob/:id', verifyFireToken, async (req, res) => {
    const id = req.params.id;
    console.log(id);
    const query = { _id: new ObjectId(id) }
    const result = await jobsCollection.findOne(query)
    res.send(result);
});




        //  Accept a job
        app.post("/accepted-tasks", verifyFireToken, async (req, res) => {
            const newTask = req.body;
            const { jobId, userEmail } = newTask;


            const existing = await acceptedTasksCollection.findOne({
                jobId,
                userEmail,
            });

            if (existing) {
                return res.status(400).send({ message: "Already accepted!" });
            }


            const result = await acceptedTasksCollection.insertOne(newTask);
            res.send(result);
        });





















        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {

        //   await client.close();
    }
}
run().catch(console.dir);