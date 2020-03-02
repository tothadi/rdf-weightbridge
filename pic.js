const http = require('http');
const Stream = require('stream').Transform;
const fs = require('fs');

exports.download = (url, filename, callback) => {

  var request = http.request(url, (response) => {
    var data = new Stream();

    response.on('data', (chunk) => {
      data.push(chunk);
    });

    response.on('end', () => {
      fs.writeFileSync(filename, data.read());
    });
  }).end();
  
  request.on('error', (err) => {
    console.log(err);
  })
  
};