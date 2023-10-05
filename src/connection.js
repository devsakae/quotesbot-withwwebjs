const { MongoClient, ServerApiVersion } = require('mongodb');

// Configurações do MongoDB
const mongoclient = new MongoClient(process.env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const database = mongoclient.db('bolao');

export default mongoclient;
export { database } ;