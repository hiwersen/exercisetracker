require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const UserModel = require('./models/user');
const ExerciseModel = require('./models/exercise');

const port = process.env.PORT || 3000;
const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/exerciseTracker';

const app = express();

/**
 * Enable CORS (Cross-origin resource sharing) middleware
 * so that the API is remotely testable by FreeCodeCamp.
 * @see {@link https://www.npmjs.com/package/cors}
 */
app.use(cors());

/**
 * Serve static files from the 'public' directory
 */
app.use('/public', express.static(__dirname + '/public'));

/**
 * Handle the root route and serve the index.html file
 */
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const connect = () => mongoose.connect(dbUri, { useNewUrlParser: true, useUnifiedTopology: true });

connect()
.then(() => {
  const dbName = mongoose.connection.name;
  console.log(`Connected to the database ${dbName} - index.js`);

  /**
   * Middleware: Body Parser
   * 
   * Use the body-parser middleware to parse 'URL-encoded request bodies', or
   * content type 'application/x-www-form-urlencoded', into JavaScript objects.
   * 
   * @see {@link https://www.npmjs.com/package/body-parser}
   */ 
  app.use(bodyParser.urlencoded({ extended: false }));

  /**
   * Validates a value as a string and trims white spaces.
   *
   * This function:
   * - throws an error if the input is not a string type;
   * - trims leading and trailing white spaces from the string;
   * - throws an error if the input becomes an empty string after trimming;
   * - returns the trimmed string.
   * 
   * @param {String} str The value to be validated.
   * @returns {String} The trimmed and validated string.
   * @throws {Error} When the input value is not of string type or becomes an empty string after trimming.
   */
  const parseString = str => {
    if (typeof str !== 'string') throw new Error('Input value is not string');
    str = str.trim();
    if (str === '') throw new Error('Input value is empty character string');
    return str;
  };

  /**
   * Validates whether an ID adheres to the MongoDB ObjectID format.
   * 
   * @param {String} _id The ID to be validated.
   * @returns {String} The validated ID.
   * @throws {Error} When the ID does not conform to a valid MongoDB ObjectID format.
   */
  const parseId = _id => {
    if (!mongoose.Types.ObjectId.isValid(_id)) throw new Error(`Invalid ID: ${_id}`);
    return _id;
  };

  /**
   * Middleware to validate the username input field for the POST api/users route 
   *
   * This function:
   * - checks if the username is a string data type
   * - trims leading and trailing white spaces from the username, if present
   * - assigns the trimmed username back into the req.body object
   * - calls the next middleware if the username is valid
   * - sends a JSON response with an error message if the username is invalid
   * 
   * @param {Object} req The Express request object.
   * @param {Object} res The Express response object.
   * @param {Function} next The next middleware function.
   * @throws {Error} When the username is not a string or becomes an empty string after trimming.
   */
  const parseUsername = (req, res, next) => {
    try {
      let { username } = req.body;
      username = parseString(username);
      req.body.username = username;
      next();
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  };

  /**
   * @api {post} /api/users Creates a new user
   * @apiName CreateUser
   * @apiGroup User
   * 
   * @apiParam (body) {String} username The username for the new user
   *
   * @apiSuccess {String} username The username of the newly created user
   * @apiSuccess {String} _id The MongoDB ObjectID of the newly created user
   * 
   * @apiSuccessExample {json} Success-Response:
   *     HTTP/1.1 200 OK
   *     {
   *       "username": "Test",
   *       "_id": "647885afc7da74ce5419854d"
   *     }
   * 
   * @apiError (500) {String} message The error message when the error occurs while creating the user
   * 
   * @apiErrorExample {json} Error-Response:
   *     HTTP/1.1 500 Internal Server Error
   *     {
   *       "message": "Error creating the user: Test"
   *     }
   * 
   * @apiError (Common) Refer to [Common Errors](../COMMON_ERRORS.md) document 
   * for common errors that can occur with this endpoint.
   */
  app.route('/api/users')
  .post(parseUsername, async (req, res) => {
    let { username } = req.body;
    const user = new UserModel({ username });
    try {
      const { username, _id } = await user.save();
      return res.json({ username, _id });
    } catch (error) {
      return res.status(500).json({ message: `Error while creating the user: ${username}` });
    }
  })

  /**
   * @api {get} /api/users Returns a list of all users
   * @apiName GetUsers
   * @apiGroup User
   *
   * @apiSuccess {Object[]} users The list of all users
   * @apiSuccess {String} user.username The username of each user
   * @apiSuccess {String} user._id The ID of each user
   * 
   * @apiSuccessExample {json} Success-Response:
   *     HTTP/1.1 200 OK
   *     [
   *        {
   *          "username": "Test_1",
   *          "_id": "647885afc7da74ce5419854d"
   *        },
   *        {
   *          "username": "Test_2",
   *          "_id": "64788b0eab794af234412fd8"
   *        }
   *     ]
   * 
   * @apiError (404) {String} message The error message when there are no users to be returned
   * 
   * @apiErrorExample {json} Error-Response:
   *     HTTP/1.1 404 Not Found
   *     {
   *       "message": "No users found in the database"
   *     }
   * 
   * @apiError (500) {String} message The error message when the error occurs while fetching the users
   * 
   * @apiErrorExample {json} Error-Response:
   *     HTTP/1.1 500 Internal Server Error
   *     {
   *       "message": "Error reading list of users"
   *     }
   */
  .get(async (req, res) => {
    try {
      const users = await UserModel.find().select('username');
      if (users.length === 0) {
        return res.status(404).json({ message: `No users found in the database` });
      } else {
        return res.json(users);
      }
    } catch (error) {
      return res.status(500).json({ message: `Error while reading list of users` });
    }
  });
  
  /**
   * Middleware to validate parameters for the POST /api/users/:_id/exercises route 
   *
   * This function:
   * - checks if the _id, description, duration, and date are string data types
   * - trims leading and trailing white spaces from those strings
   * - checks whether the _id conforms to the MongoDB ObjectID format
   * - parses the duration string value into a Number data type
   * - parses the date string value into a Date object
   * - assignes the validated _id back into the req.params object
   * - assignes the validated description, duration, and date back into the req.body object
   * 
   * @param {Object} req The Express request object.
   * @param {Object} res The Express response object.
   * @param {Function} next The next middleware function.
   * @throws {Error} When the parameters (_id, description, duration, or date) are not strings, 
   * become empty strings after trimming, the duration or date can't be parsed into number or date respectively, 
   * or the _id does not conforme to a valid MongoDB ObjectId format.
   * @returns {undefined} Calls the next middleware function in the absence of errors. If an error is thrown, 
   * it sends a JSON response with a 400 status code and an error message.
   */
  const parseExerciseInput = (req, res, next) => {
    try {
      let { _id } = req.params;
      _id = parseId(parseString(_id));

      let { description, duration, date } = req.body;
      description = parseString(description);
      duration = parseString(duration);
      duration = parseInt(duration);
      if (Number.isNaN(duration)) throw new Error('duration is not a valid number');

      if (date) {
        date = parseString(date);
        date = Date.parse(date);
        if (Number.isNaN(date)) {
          throw new Error('Invalid Date Format. See @ https://tc39.es/ecma262/#sec-date-time-string-format');
        } else {
          date = new Date(date);
        }
      }
      
      req.params._id = _id;
      Object.assign(req.body, { description, duration, date });
      next();

    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  };

  /**
   * @api {post} /api/users/:_id/exercises Creates exercise for a user
   * @apiName CreateExercise
   * @apiGroup Exercise
   * 
   * @apiParam  {String} _id The ID of the user
   * @apiParam (body) {String} description The description of the exercise
   * @apiParam (body) {Number} duration The duration of the exercise in minutes
   * @apiParam (body) {String} [date] The date of the exercise in "yyyy-mm-dd" format (Optional)
   *
   * @apiSuccess {String} username The username of the user
   * @apiSuccess {String} description The description of the created exercise
   * @apiSuccess {Number} duration The duration of the created exercise in minutes
   * @apiSuccess {String} date The date of the created exercise in "Weekday Month Day Year" format
   * @apiSuccess {String} _id The ID of the user
   * 
   * @apiSuccessExample {json} Success-Response:
   *     HTTP/1.1 200 OK
   *     {
   *       "username": "Test",
   *       "description": "Exercise description",
   *       "duration": 60,
   *       "date": "Sat Jun 03 2023"
   *       "_id": "647885afc7da74ce5419854d"
   *     }    
   * 
   * @apiError (404) {String} message The error message when no user is found with the _id
   * 
   * @apiErrorExample {json} Error-Response:
   *     HTTP/1.1 404 Not Found
   *     {
   *       "message": "No user found with _id: 647885afc7da74ce5419854d"
   *     }
   * 
   * @apiError (400) {String} message The error message when the date data is unexpected
   * 
   * @apiErrorExample {json} Error-Response:
   *     HTTP/1.1 400 Bad Request
   *     {
   *       "message": "Unrecognized date data content"
   *     }
   * 
   * @apiError (500) {String} message The error message while creating the new exercise 
   * or while fetching the user ID
   * 
   * @apiErrorExample {json} Error-Response:
   *     HTTP/1.1 500 Internal Server Error
   *     {
   *       "message": "Error while creating exercise"
   *     }
   * 
   * @apiErrorExample {json} Error-Response:
   *     HTTP/1.1 500 Internal Server Error
   *     {
   *       "message": "Error while reading _id: 647885afc7da74ce5419854d"
   *     }
   * 
   * @apiError (400) {String} message The error message when duration cannot be parsed into a Number data type
   * 
   * @apiErrorExample {json} Error-Response:
   *     HTTP/1.1 400 Bad Request
   *     {
   *       "message": "duration is not a valid number"
   *     }
   * 
   * @apiError (400) {String} message The error message when the date cannot be parsed into a Date Object
   * 
   * @apiErrorExample {json} Error-Response:
   *     HTTP/1.1 400 Bad Request
   *     {
   *       "message": "Invalid Date Format. See @ https://tc39.es/ecma262/#sec-date-time-string-format"
   *     }
   * 
   * @apiError (Common) Refer to [Common Errors](../commonErrors.md) document 
   * for common errors that can occur with this endpoint.
   */ 
  app.post('/api/users/:_id/exercises', parseExerciseInput, async (req, res) => {
    let { _id: userId } = req.params;
    
    try {
      const userDoc = await UserModel.findById(userId);
      if (!userDoc) {
        return res.status(404).json({ message: `No user found with _id: ${userId}` });
      } else {
        const { description, duration, date } = req.body;
        let exercise;

        if (date instanceof Date) {
          exercise =  new ExerciseModel({ userId, description, duration, date, });
        } else if (date === '' || date === undefined) {
          exercise = new ExerciseModel({ userId, description, duration, });
        } else {
          return res.status(400).json({ message: 'Unrecognized date data content' });
        }
        
        try {
          const { description, duration, dateString } = await exercise.save();
          const { username, _id } = userDoc;
          res.json({ username, description, duration, date: dateString, _id });
        } catch (error) {
          return res.status(500).json({ message: `Error while creating exercise` });
        }
      }
    } catch (error) {
      return res.status(500).json({ message: `Error while reading _id: ${userId}`});
    }
  });

  /**
   * Middleware to validate parameters for the POST /api/users/:_id/logs route 
   *
   * This function:
   * - checks if the _id is a string, and trims leading and trailing white spaces
   * - checks whether the _id conforms to the MongoDB ObjectID format
   * - parses the from and to date strings into Date objects
   * - parses the limit string into a Number data type
   * - assigns a DEFAULT_LIMIT value to limit if the defined value is 0 or negative number
   * - assigns the validated _id back into the req.params object
   * - assigns the validated from, to, and "limit" back to the req.query object
   * 
   * @param {Object} req The Express request object.
   * @param {Object} res The Express response object.
   * @param {Function} next The next middleware function.
   * @throws {Error} When:
   * - the _id is not a string, becomes an empty strings after trimming, or does not conform to a valid MongoDB ObjectId
   * - the provided limit cannot be parsed into a Number, or is greater than the system's MAX_LIMIT
   * - the provided from is later than the provided to, or either is not a valid date string format
   * @returns {undefined} Calls the next middleware function in the absence of errors. If an error is thrown, 
   * it sends a JSON response with a 400 status code and an error message.
   */
  const parseLogsInput = (req, res, next) => {
    let { _id } = req.params;

    try {
      _id = parseId(parseString(_id));
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }

    let { from, to, limit } = req.query;

    const parsedFrom = Date.parse(from);
    const parsedTo = Date.parse(to);
    const parsedLimit = parseInt(limit);

    const DEFAULT_LIMIT = 20;
    const MAX_LIMIT = 50;

    if (limit !== undefined && Number.isNaN(parsedLimit)) {
      return res.status(400).json({ message: `Invalid limit: ${limit}` });
    } else if (parsedLimit > MAX_LIMIT) {
      return res.status(400).json({ message: `limit cannot exceed ${MAX_LIMIT}` });
    } else {
      limit = limit && (parsedLimit > 0 ? parsedLimit : DEFAULT_LIMIT);
    }

    if (parsedFrom > parsedTo) {
      return res.status(400).json({ message: `'from' cannot be later than 'to'` });
    } else {
      if ((from !== undefined && Number.isNaN(parsedFrom)) || (to !== undefined && Number.isNaN(parsedTo))) {
        return res.status(400).json({ message: 'Invalid Date Format. See @ https://tc39.es/ecma262/#sec-date-time-string-format' });
      } else {
        from = from && parsedFrom;
        to = to && parsedTo;
      }
    }

    req.params._id = _id;
    Object.assign(req.query, { from, to, limit });

    next();
  };

  /**
   * @api {get} /api/users/:_id/logs Returns a list of exercises for a specified user
   * @apiName ReturnExercises
   * @apiGroup Exercise
   * 
   * @apiParam  {String} _id The ID of the user
   * @apiParam  {String} [from] The optional 'from' date in "yyyy-mm-dd" format
   * to specify the earliest date for selecting exercises
   * @apiParam  {String} [to] The optional 'to' date in "yyyy-mm-dd" format 
   * to specify the latest date for selecting exercises
   * @apiParam  {Number} [limit] The positive integer to limit the number of returned exercises
   *
   * @apiSuccess {String} username The username of the returned user
   * @apiSuccess {Number} count The number of exercises in the log list
   * @apiSuccess {String} _id The ID of the returned user
   * @apiSuccess {Object[]} log The list of exercise objects
   * @apiSuccess {String} exercise.description The description of each returned exercise 
   * @apiSuccess {Number} exercise.duration The duration of each returned exercise, in minutes
   * @apiSuccess {String} exercise.date The date  of each returned exercise, in "Weekday Month Day Year" format
   * 
   * @apiSuccessExample {json} Success-Response:
   *     HTTP/1.1 200 OK
   *     {
   *       "username": "Test",
   *       "count": 1,
   *       "_id": "647885afc7da74ce5419854d",
   *       "log" : [
   *        {
   *          "description": "Exercise description",
   *          "duration": 60,
   *          "date": "Sat Jun 03 2023"
   *        }
   *       ]
   *     }    
   * 
   * @apiError (404) {String} message The error message when no user is found with the specified ID
   * 
   * @apiErrorExample {json} Error-Response:
   *     HTTP/1.1 404 Not Found
   *     {
   *       "message": "No user found with _id: 647885afc7da74ce5419854d"
   *     }
   * 
   * @apiError (404) {String} message The error message when no exercises are found with the specified criteria
   * 
   * @apiErrorExample {json} Error-Response:
   *     HTTP/1.1 404 Not Found
   *     {
   *       "message": "No exercises found with criteria
   *         - ID: 647885afc7da74ce5419854d 
   *         - from: Sat Jun 03 2023 
   *         - to: Sun Jun 04 2023  
   *         - limit: 1"
   *     }
   * 
   * @apiError (500) {String} message The error message while fetching the exercise list, or the user ID
   * 
   * @apiErrorExample {json} Error-Response:
   *     HTTP/1.1 500 Internal Server Error
   *     {
   *       "message": "Error while creating exercise list"
   *     }
   * 
   * @apiErrorExample {json} Error-Response:
   *     HTTP/1.1 500 Internal Server Error
   *     {
   *       "message": "Error while reading _id: 647885afc7da74ce5419854d"
   *     }
   * 
   * @apiError (400) {String} message The error message when the specified limit can't be parsed into a Number, or
   * exceeds the systems's maximum limit (50)
   * 
   * @apiErrorExample {json} Error-Response:
   *     HTTP/1.1 400 Bad Request
   *     {
   *       "message": "Invalid limit: a1"
   *     }
   * 
   * @apiErrorExample {json} Error-Response:
   *     HTTP/1.1 400 Bad Request
   *     {
   *       "message": "limit cannot exceed 50"
   *     }
   * 
   * @apiError (400) {String} message The error message when from is a later date than to
   * 
   * @apiErrorExample {json} Error-Response:
   *     HTTP/1.1 400 Bad Request
   *     {
   *       "message": "'from' cannot be later than 'to'"
   *     }
   * 
   * @apiError (400) {String} message The error message when either date from or to cannot be parsed into a Date Object
   * 
   * @apiErrorExample {json} Error-Response:
   *     HTTP/1.1 400 Bad Request
   *     {
   *       "message": "Invalid Date Format. See @ https://tc39.es/ecma262/#sec-date-time-string-format"
   *     }
   * 
   * @apiError (Common) Refer to [Common Errors](../COMMON_ERRORS.md) document 
   * for common errors that can occur with this endpoint.
   * 
   */
  app.get('/api/users/:_id/logs', parseLogsInput, async (req, res) => {
    const { _id } = req.params;
    try {
      const userDoc = await UserModel.findById(_id);
      if (!userDoc) {
        return res.status(404).json({ message: `No user found with ID: ${_id}` });
      } else {
        const { username } = userDoc;
        let { from, to, limit } = req.query;
        
        let message = `No exercises found with criteria - ID: ${_id}`;
        let findQuery;

        if (from && to) {
          findQuery = { userId: _id, date: { $gte: from, $lte: to } };
          message += ` - from: ${new Date(from).toDateString()} - to: ${new Date(to).toDateString()}`;
        } else if (from) {
          findQuery = { userId: _id, date: { $gte: from } };
          message += ` - from: ${new Date(from).toDateString()}`;
        } else if (to) {
          findQuery = { userId: _id, date: { $lte: to } };
          message += ` - to: ${new Date(to).toDateString()}`;
        } else {
          findQuery = { userId: _id };
        }

        if (limit) message += ` - limit: ${limit}`;
        
        try {
          let log = await ExerciseModel
          .find(findQuery)
          .sort({ date: -1 })
          .limit(limit)
          .select('description duration date -_id');

          if (log.length === 0) {
            return res.status(404).json({ message });
          } else {
            log = log.map(doc => {
              const newDoc = { ...doc._doc };
              newDoc.date = newDoc.date.toDateString();
              return newDoc;
            });
            const count = log.length;
            res.json({ username, count, _id, log });
          }
        } catch (error) {
          return res.status(500).json({ message: 'Error while creating exercise list'});
        }
      }
    } catch (error) {
      return res.status(500).json({ message: `Error while reading _id: ${_id}`});
    }
  });

   /**
   * Start the server and log the listening port only after connected to the database
   */
  const listener = app.listen(port, () => {
    console.log('Listening on port ' + listener.address().port);
  });
}).catch(error => console.error(`Error connnecting to the database ${error} - index.js`));


module.exports = { dbUri, connect };