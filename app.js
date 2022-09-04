import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
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
  name: joi.string().min(3).max(30).required().trim(),
  lastStatus: joi.required()
});

const messageSchema = joi.object({
  from: joi.string().min(3).max(30).required().trim(),
  to: joi.string().min(3).max(30).required().trim(),
  text: joi.string().min(1).max(400).required(),
  type: joi.string().valid("message").valid("private_message").required(),
});

server.post('/participants', async (req, res) => {
  const { name } = req.body;
  const newParticipant = { name, lastStatus: Date.now() };

  const validation = participantSchema.validate(newParticipant, { abortEarly: false });

  if (validation.error) {
    const errors = validation.error.details.map(detail => detail.message);
    console.log(errors);
    return res.status(409).send(errors);
  }

  try {
    const repeatedUser = await db.collection('participants').findOne({ name: name });
    if (repeatedUser) {
      return res.status(422).send(`O nome ${name} já está sendo usado, escolha outro nome`);
    }

    await db.collection('participants').insertOne({ ...newParticipant });
    await db.collection('messages').insertOne({
      from: name,
      to: 'Todos',
      text: 'entra na sala...',
      type: 'status',
      time: dayjs().format('HH:mm:ss')
    });
    res.sendStatus(201);
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
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


server.post('/messages', async (req, res) => {
  const from = req.headers.user;
  const { to, text, type } = req.body;
  const message = { from, to, text, type, };

  const validation = messageSchema.validate(message, { abortEarly: false });

  if (validation.error) {
    const errors = validation.error.details.map(detail => detail.message);
    console.log(errors);
    return res.status(422).send(errors);
  }

  try {

    const isUserlogged = await db.collection('participants').findOne({ name: from });
    if (!isUserlogged) {
      return res.status(422).send('Realize o login novamente para enviar a mensagem');
    }

    await db.collection('messages').insertOne({
      ...message,
      time: dayjs().format('HH:mm:ss')
    });
    res.sendStatus(201);
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
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
  const filtered = messages.filter(message => (message.to === "Todos" || message.to === user || message.from === user));
  return filtered;
}

server.post('/status', async (req, res) => {
  const checkParticipant = req.headers.user;

  try {
    const isParticipantActive = await db.collection('participants').findOne({ name: checkParticipant });

    if (!isParticipantActive) {
      return res.status(404).send('Usuário não está logado!');
    }

    await db.collection('participants').updateOne({ _id: ObjectId(isParticipantActive._id) },
      { $set: { lastStatus: Date.now() } });
    res.status(200).send('Login atualizado');

  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

async function removeInactive() {

  try {
    const allUsers = await db.collection('participants').find().toArray();

    allUsers.forEach(async user => {
      const lastUpdate = Date.now() - user.lastStatus;

      if (lastUpdate >= 10000) {
        await db.collection('participants').deleteOne({ _id: ObjectId(user._id) });
        await db.collection('messages').insertOne({
          from: user.name,
          to: 'Todos',
          text: 'saiu na sala...',
          type: 'status',
          time: dayjs().format('HH:mm:ss')
        });
      }
    });
  } catch (error) {
    console.log(error);
  }
}

setInterval(removeInactive, 15000);

server.listen(port, () => {
  console.log(`Listen on port ${port}`);
  console.log(dayjs().format('HH:mm:ss'));
});