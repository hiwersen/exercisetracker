const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const UserModel = require('./models/user');
const ExerciseModel = require('./models/exercise');

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
  const dbName = mongoose.connection.name;
  console.log(`Connected to the database ${dbName}`);

  // parse application/x-www-form-urlencoded
  // @see {@link https://www.npmjs.com/package/body-parser}
  app.use(bodyParser.urlencoded({ extended: false }));

  const parseString = (str) => {
    if (!str || typeof str !== 'string') throw new Error('Invalid or missing string input value');
    str = str.trim();
    if (!str) throw new Error('Empty string input value');
    return str;
  };

  const parseUsername = (req, res, next) => {
    try {
      let { username } = req.body;
      username = parseString(username);
      req.body.username = username;
      next();
    } catch (err) {
      console.error(err);
      return res.status(400).json({ message: err.message });
    }
  };

  app.route('/api/users')
  .post(parseUsername, async (req, res) => {
    let { username } = req.body;
    const user = new UserModel({ username });
    try {
      const { username, _id } = await user.save();
      return res.json({ username, _id });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: `Error creating the user ${username}` });
    }
  })
  .get(async (req, res) => {
    try {
      const users = await UserModel.find().select('username');
      return res.json(users);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: `Error reading list of users` });
    }
  });
  
  const parseExerciseInput = (req, res, next) => {
    try {
      let { _id } = req.params;
      _id = parseString(_id);

      let { description, duration, date } = req.body;
      description = parseString(description);
      duration = parseString(duration);
      duration = parseInt(duration);
      if (Number.isNaN(duration)) throw new Error('duration is not a valid number');

      if (date) {
        date = parseString(date);
        date = Date.parse(date);
        if (Number.isNaN(date)) throw new Error('Invalid Date Format. See @ https://tc39.es/ecma262/#sec-date-time-string-format');
      }
      
      req.params._id = _id;
      Object.assign(req.body, { description, duration, date });
      next();

    } catch (err) {
      console.error(err);
      return res.status(400).json({ message: err.message });
    }
  };

  app.post('/api/users/:_id/exercises', parseExerciseInput, async (req, res) => {
    let { _id: userId } = req.params;
    
    try {
      const userDoc = await UserModel.findById(userId);
      if (!userDoc) {
        return res.status(404).json({ message: `No user found with _id: ${userId}` });
      } else {
        const { description, duration, date } = req.body;
        let exercise;

        if (date) {
          exercise =  new ExerciseModel({ userId, description, duration, date, });
        } else if (date === '') {
          exercise = new ExerciseModel({ userId, description, duration, })
        } else {
          return res.status(400).json({ message: 'Unrecognized date data content' });
        }
        
        try {
          const { description, duration, dateString: date } = await exercise.save();
          const { username, _id } = userDoc;
          res.json({ username, description, duration, date, _id });
        } catch (err) {
          console.error(err);
          return res.status(500).json({ message: `Error creating exercise` });
        }
      }
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: `Error reading _id: ${userId}`});
    }
  });

  const parseLogsInput = (req, res, next) => {
    const { _id } = req.params;
    let { from, to, limit } = req.query;
    const DEFAULT_LIMIT = 20;
    const MAX_LIMIT = 50;
    const parsedLimit = parseInt(limit);
    const parsedFrom = Date.parse(from);
    const parsedTo = Date.parse(to);

    if (!mongoose.Types.ObjectId.isValid(_id)) return res.status(400).json({ message: 'Invalid _id' });

    if (limit !== undefined && Number.isNaN(parsedLimit)) {
      return res.status(400).json({ message: 'Invalid limit' });
    } else if (parsedLimit > MAX_LIMIT) {
      return res.status(400).json({ message: `Limit cannot exceed ${MAX_LIMIT}` });
    } else {
      limit = limit && parsedLimit > 0 ? parsedLimit : DEFAULT_LIMIT;
    }

    if (parsedFrom > parsedTo) {
      return res.status(400).json({ message: `'from' cannot be greater than 'to'` });
    } else {
      if (from !== undefined && Number.isNaN(parsedFrom)) {
        return res.status(400).json({ message: 'Invalid Date Format. See @ https://tc39.es/ecma262/#sec-date-time-string-format' });
      } else {
        from = from && parsedFrom;
      }
  
      if (to !== undefined && Number.isNaN(parsedTo)) {
        return res.status(400).json({ message: 'Invalid Date Format. See @ https://tc39.es/ecma262/#sec-date-time-string-format' });
      } else {
        to = to && parsedTo;
      }
    }
    Object.assign(req.query, { from, to, limit });

    next();
  };

  app.get('/api/users/:_id/logs', parseLogsInput, async (req, res) => {
    const { _id } = req.params;
    try {
      const userDoc = await UserModel.findById(_id);
      if (!userDoc) {
        return res.status(404).send(`No user found with ID: ${_id}`);
      } else {
        const { username } = userDoc;
        let { from, to, limit } = req.query;
        let findQuery;

        if (from && to) {
          findQuery = { userId: _id, date: { $gte: from, $lte: to } };
        } else if (from) {
          findQuery = { userId: _id, date: { $gte: from } };
        } else if (to) {
          findQuery = { userId: _id, date: { $lte: to } };
        } else {
          findQuery = { userId: _id };
        }
        
        try {
          let log = await ExerciseModel
          .find(findQuery)
          .sort({ date: -1 })
          .limit(limit)
          .select('description duration dateString -_id');

          if (log.length === 0) {
            return res.status(400).json({ message: `No exercise found for user ID: ${_id}` });
          } else {
            log = log.map(doc => {
              const newDoc = { ...doc._doc, date: doc.dateString };
              delete newDoc.dateString;
              return newDoc;
            });
            const count = log.length;
            res.json({ username, count, _id, log });
          }
        } catch (err) {
          console.error(err);
          return res.status(500).json({ message: 'Error reading exercise list'});
        }
      }
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: `Error reading _id: ${_id}`});
    }
  });

  const listener = app.listen(port, () => {
    console.log('Listening on port ' + listener.address().port);
  });
}).catch(err => console.error(`Error connnecting to the database ${err}`));
