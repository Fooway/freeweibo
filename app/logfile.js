var fs = require('fs');
var path = require('path');
var err_file = 'err.log';
var log_file = 'run.log';

var logpath = path.normalize(__dirname + '/../logs/');

module.exports = {
  logger: {
    err: function function_name (str) {
      // body...
    },
    info: function function_name (str) {
      // body...
    }
  }
}
