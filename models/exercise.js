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
    dateString: {
        type: String,
        default: function() { return this.date.toDateString(); },
    },
    userId: String,
});

const ExerciseModel = mongoose.model('Exercise', exerciseSchema);

module.exports = ExerciseModel;