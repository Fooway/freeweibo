var path = require('path');
var mkdirp= require('mkdirp');
var log4node = require('log4node');
var log_dir = path.normalize(__dirname + '/../logs/');

mkdirp.sync(log_dir);
module.exports =  new log4node.Log4Node({
  level: 'info',
  file: log_dir + 'run.log',
  callback: function (line) {
    console.log(line);
  }
});
