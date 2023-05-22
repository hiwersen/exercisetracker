const mongoose = require('mongoose');

const { Schema } = mongoose;

const userSchema = new Schema({
    username: {
        type: String,
        unique: true,
        required: true,
    },
});

const userModel = mongoose.model('User', userSchema);

module.exports = userModel;