const { MongoClient, ServerApiVersion } = require('mongodb');
const { config } = require('dotenv');
config();

// Configurações do MongoDB
const mongoclient = new MongoClient(process.env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

module.exports = {
  mongoclient
}