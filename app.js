
/**
 * Module dependencies.
 */

var express = require('express');
var http = require('http');
var path = require('path');
var fetcher = require('./fetcher');
var config = require('./app/config');
var controller = require('./app/controller');
var mail = require('./app/mail');
var log4node = require('log4node');

var log = new log4node.Log4Node({level: 'info', file: path.normalize(__dirname + '/logs/run.log')});

config.log = log;

process.on('uncaughtException', function (e) {
  console.error('EXCEPTION: ' + e.stack);
  log.error(err.stack);
  sendmail({
    address: 'tristones.liu@gmail.com', 
    sub: 'Exception On Exit at ' + (new Date()).toLocaleString('en-US'),
    text: '>>> ' + e.stack
    });
});


process.on('exit', function () {
  console.log('process exiting...');
});

// first, boot fetcher
fetcher(controller.db, config);
// then, mailer
var sendmail = mail(controller.db, config);

var app = express();

// all environments
app.set('port', 3001);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon(__dirname + '/public/images/favicon.ico'));
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser('your secret here'));
app.use(express.session());
app.use(app.router);
app.use(require('stylus').middleware(__dirname + '/public'));
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/about', function(req, res) { res.render('about', {title: 'About'}); });
app.get('/tweets', controller.getPage);
app.get('/cancel', controller.unsubscribe);
app.get('/subscribe', controller.subscribe);
app.get('/', controller.index);

http.createServer(app).listen(app.get('port'), function(){
  log.info('Express server listening on port ' + app.get('port'));
});
