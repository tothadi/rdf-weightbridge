var mongoose = require('mongoose');

var weightSchema = new mongoose.Schema({
  weight: Number,
  date: String,
  plate: String,
  direction: String
});

mongoose.model('Weight', weightSchema);
