var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var app = express();
var server = require('http').createServer(app);
var cors = require('cors');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var io = require('socket.io')(server);
var stats = require("stats-lite");
var dater = require('date-and-time');
var mongoose = require('mongoose');

require('./models/db');

var Weight = mongoose.model('Weight');
var weightBuffer = [];

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(cors());

app.use(favicon(__dirname + '/client/favicon.ico'));
app.use(express.static(path.join(__dirname, 'client')));
app.get('*', function (req, res) {
    res.sendFile(path.join(__dirname, 'client/index.html'));
});

app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// [SH] Catch unauthorised errors
app.use(function (err, req, res, next) {
    if (err.name === 'UnauthorizedError') {
        res.status(401);
        res.json({ "message": err.name + ": " + err.message });
    }
});

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

function getWeights() {

    var weight = require('./scale');
    //console.log(weight);

    if (weight !== undefined && typeof (weight) === 'number' && !isNaN(weight) && weight !== 0) {
        weightBuffer.push(weight);
    }

    if (weight < 100 && !isNaN(weight)) {

        var avgWeight = stats.mode(weightBuffer);
        var now = new Date();
        var newDate = dater.format(now, 'YYYY.MM.DD HH:mm:ss');

        weightBuffer.length = 0;

        if (avgWeight !== undefined && typeof (avgWeight) === 'number' && !isNaN(avgWeight) && avgWeight > 500) {

            var newWeight = new Weight();
            newWeight.weight = avgWeight;
            newWeight.date = newDate;
            newWeight.save();

        };

    };

};

setInterval(function () {

    getWeights();

}, 3000);

io.on('connection', function (client) {

    client.emit('connectStatus', 'Server Connected');

    client.on('join', function (data) {
        console.log(data);
    });

    client.on('join', function () {

        console.log('client on');

        setInterval(function () {

            var weight = require('./scale');
            //console.log(weight);

            if (!isNaN(weight)) {
                client.emit('weight', weight);
            }

            tableUpdate();

        }, 3000);

        function tableUpdate() {
            Weight.find({}, {
                '_id': 0,
            }, (err, weights) => {
                if (err) {
                    console.log(err);
                } else {
                    var todayWeights = [];
                    weights.forEach((value) => {
                        var dbDate = dater.preparse(value.date, 'YYYY.MM.DD HH:mm:ss');
                        var now = new Date();
                        var newDate = dater.format(now, 'YYYY.MM.DD HH:mm:ss');
                        var today = dater.preparse(newDate, 'YYYY.MM.DD HH:mm:ss');
                        if (dbDate.Y == today.Y && dbDate.M == today.M && dbDate.D == today.D) {
                            todayWeights.push(value);
                        }
                    });
                    function compare(a, b) {
                        if (a.date < b.date) {
                            return 1;
                        }
                        if (a.date > b.date) {
                            return -1;
                        }
                        return 0;
                    }
                    todayWeights.sort(compare);
                    client.emit('tableupdate', todayWeights);
                }
            });
        };

    });

    client.on('dateinput', function (data) {
        Weight.find({}, {
            '_id': 0,
        }, (err, weights) => {
            if (err) {
                console.log(err);
            } else {
                var filterWeights = [];
                weights.forEach(function (value) {
                    var dbDate = dater.preparse(value.date, 'YYYY.MM.DD HH:mm:ss');
                    var filterDate = dater.preparse(data, 'YYYY.MM.DD HH:mm:ss');
                    if (dbDate.Y === filterDate.Y && dbDate.M === filterDate.M && dbDate.D === filterDate.D) {
                        filterWeights.push(value);
                    }
                });
                function compare(a, b) {
                    if (a.date < b.date) {
                        return -1;
                    }
                    if (a.date > b.date) {
                        return 1;
                    }
                    return 0;
                }
                filterWeights.sort(compare);
                client.emit('updatebydate', filterWeights);
            }
        });
    });

    client.on('disconnect', function () {
        console.log('Client disconnected');
    });

});

server.listen(8080, 'localhost'); //Localhost for test purposes
