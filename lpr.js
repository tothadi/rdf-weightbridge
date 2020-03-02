const bs = require('nodestalker'),
      tube = 'alprd',
      app = require('./app');

function processJob(job, callback) {
    // doing something really expensive
    //console.log('processing...');
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
    var client = bs.Client(process.env.QUEUE_URI);

    client.on('error', errorEventHandler);

    client.watch(tube).onSuccess(function (data) {
        //console.log(data)
        client.reserve().onSuccess(function (job) {
            //console.log('received job:', job);
            resJob();

            processJob(job, function () {
                client.deleteJob(job.id).onSuccess(function (del_msg) {
                    //console.log('deleted', job);
                    //console.log(del_msg);
                    client.disconnect();
                    app.getPlates(JSON.parse(job.data));
                });
            });
        });
    });
}

resJob();