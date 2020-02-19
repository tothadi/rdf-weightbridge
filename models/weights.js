var mongoose = require('mongoose');

var weightSchema = new mongoose.Schema({
  weight: Number,
  date: String,
  plate: String
});

mongoose.model('Weight', weightSchema);
