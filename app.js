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
  db.collection('messages').insertOne({
    from: name,
    to: 'Todos',
    text: 'entra na sala...',
    type: 'status',
    time: dayjs().format('HH:mm:ss')
  });

  res.sendStatus(201);
});

server.get('/participants', async (req, res) => {

  try {
    const participants = await db.collection('participants').find().toArray();
    res.send(participants);
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
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

  res.sendStatus(201);
});

server.get('/messages', async (req, res) => {
  const user = req.headers.user;

  try {
    const messages = await db.collection('messages').find().toArray();
    const filteredMessages = filterMessages(messages, user);
    res.send(filteredMessages);
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }

});

function filterMessages(messages, user) {
  const filtrados = messages.filter(value => { value.to === "Todos" || value.to === user; });
  console.log(filtrados);
  return filtrados;
}

server.listen(port, () => {
  console.log(`Listen on port ${port}`);
  console.log(dayjs().format('HH:mm:ss'));
});