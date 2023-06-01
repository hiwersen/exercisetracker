require('dotenv').config();
const mongoose = require('mongoose');
const ExerciseModel = require('../models/exercise');
const { connect } = require('../index');

(async () => {
    try {
        await connect();
        mongoose.connection.once('open', async () => {
            const connectionName = mongoose.connection.name;
            const collectionName = ExerciseModel.collection.name;

            console.log(`Connected to the database: ${connectionName} - migrateExercise.js`);

            try {
                const exercises = await ExerciseModel.find({});
                if (exercises.length !== 0) {
                    for (const exercise of exercises) {
                        const newDate = Date.parse(exercise.date);
                        try {
                            // Sequential execution: 
                            // wait for each operation to complete before moving on to the next document in the loop
                            await ExerciseModel.updateOne({ _id: exercise._id }, { $set: { date: newDate } });
                        } catch (error) {
                            console.error(`Error updating document ${exercise} to database`, error);
                        }
                    }
                    console.log('Migration completed successfully');
                } else {
                    console.log(`No document found in collection ${collectionName}`);
                }
            } catch (error) {
                console.error(`Error fetching collection ${collectionName} - migrateExercise.js`, error);
            }
        });
        } catch (error) {
            console.error(`Error connnecting to the database - migrateExercise.js`, error);
        }
})();