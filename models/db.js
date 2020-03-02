require('../config/config')
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var gracefulShutdown;
var dbURI = process.env.MONGODB_URI

mongoose.set('useCreateIndex', true);

function connectMongoose() {
  mongoose.connect(dbURI, { useUnifiedTopology: true, useNewUrlParser: true })
    .then(() => console.log("DB server connect"))
    .catch(e => console.log("DB error", e));
};

connectMongoose();

var db = mongoose.connection;

// Added check for DB connection

if (!db)
  console.log("Error connecting db")
else
  console.log("Db connected successfully")

// CONNECTION EVENTS
mongoose.connection.on('connected', function () {
  console.log('Mongoose connected to ' + dbURI);
});
mongoose.connection.on('error', function (err) {
  console.log('Mongoose connection error: ' + err);
  setTimeout(() => {
    connectMongoose();
  }, 3000);
});
mongoose.connection.on('disconnected', function () {
  console.log('Mongoose disconnected');
});

// CAPTURE APP TERMINATION / RESTART EVENTS
// To be called when process is restarted or terminated
gracefulShutdown = function (msg, callback) {
  mongoose.connection.close(function () {
    console.log('Mongoose disconnected through ' + msg);
    callback();
  });
};
// For nodemon restarts
process.once('SIGUSR2', function () {
  gracefulShutdown('nodemon restart', function () {
    process.kill(process.pid, 'SIGUSR2');
  });
});
// For app termination
process.on('SIGINT', function () {
  gracefulShutdown('app termination', function () {
    process.exit(0);
  });
});
// For Heroku app termination
process.on('SIGTERM', function () {
  gracefulShutdown('Heroku app termination', function () {
    process.exit(0);
  });
});

// BRING IN YOUR SCHEMAS & MODELS
require('./weights');