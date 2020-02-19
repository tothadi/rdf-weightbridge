var bs = require('nodestalker'),
    tube = 'alprd';

function processJob(job, callback) {
    // doing something really expensive
    console.log('processing...');
    setTimeout(function () {
        callback();
    }, 1000);
}

function errorEventHandler(err) {
    console.log(`error: ${err.message}`);
    setInterval(() => {
        resJob()
    }, 5000)
}

function resJob() {
    var client = bs.Client('127.0.0.1:11300');

    client.on('error', errorEventHandler);

    client.watch(tube).onSuccess(function (data) {
        //console.log(data)
        client.reserve().onSuccess(function (job) {
            console.log('received job:', job);
            resJob();

            processJob(job, function () {
                client.deleteJob(job.id).onSuccess(function (del_msg) {
                    //console.log('deleted', job);
                    //console.log(del_msg);
                    client.disconnect();
                });
                var vehicle = JSON.parse(job.data)
                if (vehicle.data_type == 'alpr_group') {
                   module.exports = vehicle.candidates[0].plate;
                }
            });
        });
    });
}

resJob();