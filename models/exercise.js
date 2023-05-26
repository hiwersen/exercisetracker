const mongoose = require('mongoose');

const { Schema } = mongoose;

const exerciseSchema = new Schema({
    description: {
        type: String,
        required: true,
    },
    duration: {
        type: Number,
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
    userId: String,
});

// Create dateString virtual
// Virtuals are not stored in the database, they're only present on the JavaScript side
exerciseSchema.virtual('dateString').get(function() {
    return this.date.toDateString();
  });

const ExerciseModel = mongoose.model('Exercise', exerciseSchema);

module.exports = ExerciseModel;