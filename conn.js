import { MongoClient } from "mongodb";
import "dotenv/config";

const connectionString = process.env.CONNECTION_STRING;

const client = new MongoClient(connectionString);

let database;

async function getDatabase() {
  if (!database) {
    try {
      const conn = await client.connect();
      database = conn.db("copperstate");
      console.log("Connected to the database successfully.");
    } catch (e) {
      console.error(e);
      throw e;
    }
  }
  return database;
}

export default getDatabase;
