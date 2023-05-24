const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');
const UserModel = require('./models/user');

require('dotenv').config();

const port = process.env.PORT || 3000;
const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/execiseTracker';

const app = express();

app.use(cors());

app.use('/public', express.static(__dirname + '/public'));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

mongoose.connect(dbUri, { useNewUrlParser: true, useUnifiedTopology: true })
.then(() => {
  console.log(`Connected to the database ${mongoose.connection.name}`);

  // parse application/x-www-form-urlencoded
  // @see {@link https://www.npmjs.com/package/body-parser}
  app.use(bodyParser.urlencoded({ extended: false }));

  app.post('/api/users', async (req, res) => {
    const { username } = req.body;

    const userDoc = new UserModel({ username });

    try {
      const { username, _id } = await userDoc.save();
      res.json({ username, _id });

    } catch (err) {
      console.error(err);
    }

  });

  app.get('/api/users', async (req, res) => {
    const client = new MongoClient(dbUri);

    try {
      await client.connect();
      try {
        const dbName = dbUri.split('/').pop().split('?')[0];
        const collectionName = UserModel.collection.name;
        const db = client.db(dbName);
        const collection = db.collection(collectionName);

        const documents = await collection.find().toArray();
        const users = [];
        for (const doc of documents) {
          const { username, _id } = doc;
          users.push({ username, _id });
        }
        res.json(users);
      } catch (err) {
        console.error(`Error fetching documents from Collection ${collection}: ${err}`);
      }
    } catch (err) {
      console.error(`Error connnecting to the client ${err}`);
    }
  });

  const listener = app.listen(port, () => {
    console.log('Listening on port ' + listener.address().port);
  });
}).catch(err => console.error(`Error connnecting to the database ${err}`));
