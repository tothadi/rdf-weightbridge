require('events').defaultMaxListeners = 20;
const app = require('./app');
const net = require('net');
const port = 4147;
const host = '185.205.250.127';
const timeout = 3000;
const socket = new net.Socket();
socket.setEncoding('utf8');
const stats = require("stats-lite");
let weightBuffer = [];

function makeConnection() {
    socket.removeAllListeners();
    socket.on('error', errorEventHandler);
    socket.connect(port, host, connectEventHandler);
}
function connectEventHandler() {
    //console.log('connected');
    socket.on('readable', onReadable);
    socket.on('end', endEventHandler);
    socket.on('timeout', timeoutEventHandler);
    socket.on('error', errorEventHandler);
    socket.on('close', closeEventHandler);
    setTimeout(() => {
        socket.destroy();
        //console.log('disconnected');
    }, 1000);
}
function endEventHandler() {
    return    
    //console.log('end');
}
function timeoutEventHandler() {
    console.log('timeout');
}
function errorEventHandler(err) {
    console.log(`error: ${err.message}`);
}
function closeEventHandler() {
    return
    //console.log('closed');
}
function onReadable() {
    let chunk;
    try {
        while (null !== (chunk = socket.read())) {
            let d_index = chunk.indexOf('KG');
            var weight = parseInt(chunk.substring((d_index - 5), d_index));
            if (weight !== undefined && typeof (weight) === 'number' && !isNaN(weight)) {
                weightBuffer.push(weight);
            }
        }
    } catch (err) {
        console.log(`error: ${err.message}`);
    }

    setTimeout(() => {
        if (weightBuffer.length > 5) {
            gw();
        }
    }, 1000);
}

function gw() {
    var avgWeight = stats.mode(weightBuffer);
    //console.log(weightBuffer);
    weightBuffer.length = 0;
    //console.log(avgWeight);
    app.getWeights(avgWeight);
}

setInterval(makeConnection, timeout);