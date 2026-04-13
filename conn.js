import { MongoClient } from "mongodb";
import "dotenv/config";

const connectionString = process.env.CONNECTION_STRING;

const client = new MongoClient(connectionString);

let conn;

try {
  conn = await client.connect();
  console.log("Connected to the database successfully.");
} catch (e) {
  console.error(e);
}

const database = conn.db("copperstate");

export default database;
