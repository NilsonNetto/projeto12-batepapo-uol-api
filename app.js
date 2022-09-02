import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dayjs from "dayjs";
import joi from "joi";
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

const participantSchema = joi.object({
  name: joi.string().min(3).max(30).required(),
  lastStatus: joi.required()
});

const messageSchema = joi.object({
  from: joi.string().min(3).max(30).required(),
  to: joi.string().min(3).max(30).required(),
  text: joi.string().min(1).max(400).required(),
  type: joi.string().valid("message").valid("private_message").required(),
});

server.post('/participants', (req, res) => {
  const { name } = req.body;
  const newParticipant = { name, lastStatus: Date.now() };

  const validation = participantSchema.validate(newParticipant, { abortEarly: false });

  if (validation.error) {
    const errors = validation.error.details.map(detail => detail.message);
    console.log(errors);
    return res.status(422).send(errors);
  }

  db.collection('participants').insertOne({ newParticipant });
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
  const message = { from, to, text, type, };

  const validation = messageSchema.validate(message, { abortEarly: false });

  if (validation.error) {
    const errors = validation.error.details.map(detail => detail.message);
    console.log(errors);
    return res.status(422).send(errors);
  }

  db.collection('messages').insertOne({
    ...message,
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
  const filtered = messages.filter(message => (message.to === "Todos" || message.to === user));
  return filtered;
}

server.listen(port, () => {
  console.log(`Listen on port ${port}`);
  console.log(dayjs().format('HH:mm:ss'));
});