var log4node = require('log4node');

module.exports =  new log4node.Log4Node({level: 'info', file: path.normalize(__dirname + '/logs/run.log')});
