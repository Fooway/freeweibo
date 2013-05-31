
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

process.on('uncaughtException', function (e) {
  console.error('[' + (new Date()).toLocaleString('en-US') + '] ' + 'EXCEPTION: ' + e);
  sendmail({
    address: 'tristones.liu@gmail.com', 
    sub: 'Exception On Exit at ' + (new Date()).toLocaleString('en-US'),
    text: '>>> ' + e
    }, process.exit);
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

app.get('/about', function(req, res) {
  res.render('about');
});
app.get('/cancel', controller.unsubscribe);
app.get('/', controller.index);
app.post('/', controller.getPage);
app.post('/subscribe', controller.subscribe);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
