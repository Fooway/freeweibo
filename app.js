/**
 * Module dependencies.
 */

var express = require('express');
var http = require('http');
var path = require('path');
var crawler = require('./crawler');
var controller = require('./app/controller');
var mail = require('./app/mail');
var log = require('./app/log');

// change timezone to HongKong(GMT+8)
process.env.TZ = 'Hongkong';

process.on('uncaughtException', function (e) {
  log.error(e.stack);
  mail.send({
    address: 'tristones.liu@gmail.com', 
    sub: 'Exception On Exit at ' + (new Date()).toISOString(),
    text: '>>> ' + e.stack
  });
  process.exit(0);
});


// boot crawler
crawler();
// start mailer task
mail.cron();

var app = express();

// all environments
app.set('port', 3001);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon(__dirname + '/public/images/favicon.ico'));
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser('*hd&hdo*(Qhdsajk'));
app.use(express.session());
app.use(app.router);
app.use(require('stylus').middleware(__dirname + '/public'));
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/about', controller.about);
app.get('/admin', controller.admin);
app.get('/login', controller.login);
app.get('/', controller.index);

app.post('/auth', controller.auth);
app.post('/subscribe', controller.subscribe);
app.get('/cancel', controller.unsubscribe);
app.post('/user', controller.addUsers);
app.delete('/user', controller.removeUser);

http.createServer(app).listen(app.get('port'), function(){
  log.info('Express server listening on port ' + app.get('port'));
});
