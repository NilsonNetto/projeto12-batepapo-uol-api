import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dayjs from "dayjs";
import dotenv from "dotenv";
dotenv.config();

const server = express();
const port = 5000;

server.use(express.json());
server.use(cors());

const mongoClient = new MongoClient(process.env.MONGO_URI);
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


server.post('/messages', (req, res) => {
  const from = req.headers.user;
  const { to, text, type } = req.body;

  db.collection('messages').insertOne({
    from,
    to,
    text,
    type,
    time: dayjs().format('HH:mm:ss')
  });

  res.send('ok');
});

server.get('/messages', async (req, res) => {
  const messages = await db.collection('messages').find().toArray();
  res.send(messages);
});

server.listen(port, () => {
  console.log(`Listen on port ${port}`);
  console.log(dayjs().format('HH:mm:ss'));
});