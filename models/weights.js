var mongoose = require('mongoose');

var weightSchema = new mongoose.Schema({
  weight: Number,
  date: String
});

mongoose.model('Weight', weightSchema);
