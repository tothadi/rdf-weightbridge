require('./config/config');
const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const app = express();
const http = require('http');
const fs = require('fs');
const server = http.createServer(app);
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const io = require('socket.io')(server);
const stats = require("stats-lite");
const dater = require('date-and-time');
const mongoose = require('mongoose');
const observe = require('observe');
const pic = require('./pic');

require('./models/db');

var Weight = mongoose.model('Weight');
var weightBuffer = [];

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(cors());

app.use(favicon(__dirname + '/client/favicon.ico'));
app.use(express.static(path.join(__dirname, '/client')));
app.get('*', function (req, res) {
    res.sendFile(path.join(__dirname, '/client/index.html'));
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


require('./lpr');
require('./scale');

var plate = '';
var direction = 0;
var picId = '';
var weightToSend = {
    weight: 0
}

var observer = observe(weightToSend);

module.exports.getPlates = (lpr) => {
    if (lpr.data_type) {
        if (lpr.data_type.toString() === 'alpr_group' && lpr.matches_template) {
            if (plate.length === 0) {
                try {
                    plate = lpr.best_plate_number;
                    direction = lpr.travel_direction;
                    picId = lpr.best_uuid;
                } catch (err) {
                    console.log(err.message);
                }
            }
            console.log(plate + ', ' + direction + ', ' + picId);
        }
    }
}

module.exports.getWeights = (weight) => {

    if (weight != weightToSend.weight) {
        observer.set('weight', weight);
    }

    if (weight !== undefined && typeof (weight) === 'number' && !isNaN(weight) && weight > 200) {
        weightBuffer.push(weight);
    }

    if (weight < 200 && !isNaN(weight)) {

        var avgWeight = stats.mode(weightBuffer);
        var now = new Date();
        var newDate = dater.format(now, 'YYYY.MM.DD HH:mm:ss');

        weightBuffer.length = 0;

        if (avgWeight !== undefined && typeof (avgWeight) === 'number' && !isNaN(avgWeight) && avgWeight > 500) {

            var newWeight = new Weight();
            newWeight.weight = avgWeight;
            newWeight.date = newDate;
            if (plate === '') {
                newWeight.plate = 'NA';
            } else {
                newWeight.plate = plate;
            }
            if (direction === 0) {
                direction = 'NA';
                newWeight.direction = direction;
            } else if (direction > 0 && direction < 180) {
                direction = 'ki';
                newWeight.direction = direction;
            } else {
                direction = 'be';
                newWeight.direction = direction;
            }
            newWeight.save(function (err, product) {
                if (err) {
                    console.log(err);
                }
                console.log(product + ' saved to db!');

                var link = process.env.PIC_URI + picId;
                var savePath = process.env.SAVE_PATH + dater.format(now, 'YYYY-MM-DD') + '/';
                var fileName = dater.format(now, 'HH_mm_ss') + '_' + plate + '_' + direction + '.jpg';
                var filePath = savePath + fileName;
                if (!fs.existsSync(savePath)) {
                    fs.mkdirSync(savePath);
                }

                if (plate.length === 6) {
                    pic.download(link, filePath, function () {
                        console.log('Image saved');
                    });
                }
            });

        };
        setTimeout(() => {
            plate = '';
            direction = 0;
            picId = '';
        }, 500);

    };

};

io.on('connection', function (client) {

    client.emit('connectStatus', 'Server Connected');

    client.on('join', function (data) {
        console.log(data);
    });

    client.on('join', function () {

        observer.on('change', (change) => {
            if (change.property[0] === 'weight') {
                client.emit('weight', observer.subject.weight);
                client.emit('plate', plate);
                tableUpdate();
            }
        });

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

        tableUpdate();

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
                    if (!data) {
                        data = dater.format(new Date, 'YYYY.MM.DD');
                    }
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

server.listen(process.env.port, process.env.serverIP); //Localhost for test purposes
