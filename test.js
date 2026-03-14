const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = "mongodb+srv://vicky:vishal1234@flutter-e2e-chat.klxpgkv.mongodb.net/?appName=flutter-e2e-chat";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();

    await client.db("admin").command({ ping: 1 });

    console.log("MongoDB Connected Successfully");
  } finally {
    await client.close();
  }
}

run().catch(console.dir);