import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dayjs from "dayjs";

const server = express();
const port = 5000;

server.use(express.json());
server.use(cors());

const mongoClient = new MongoClient("mongodb://localhost:27017");
let db;

mongoClient.connect().then(() => {
  db = mongoClient.db('BatePapoUOL-API');
});

server.post('/participants', (req, res) => {
  const { name } = req.body;

  db.collection('participants').insertOne({
    name: name,
    lastStatus: Date.now()
  });

  res.send('ok');
});

server.get('/participants', async (req, res) => {

  const participants = await db.collection('participants').find().toArray();
  res.send(participants);
});


server.listen(port, () => {
  console.log(`Listen on port ${port}`);
});