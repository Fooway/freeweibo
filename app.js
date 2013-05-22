
/**
 * Module dependencies.
 */

var express = require('express');
var http = require('http');
var path = require('path');
var controller = require('./app/controller');

// fork worker and redirect output stream
var worker = require('child_process').fork(path.join(__dirname, 'fetcher/fetchApp.js'));

process.on('uncaughtException', function(e) {
  console.log('uncaught exception:');
  console.log(e);
  process.exit();
});

process.on('SIGTERM', function() {
  console.log('received SIGTERM...');
  process.exit();
}); 

process.on('exit', function() {
  console.log('exiting...killing worker');
  worker.kill();
});

var app = express();

// all environments
app.set('port', 3001);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser('your secret here'));
app.use(express.session());
app.use(app.router);
app.use(require('stylus').middleware({debug: true,
  src:__dirname + '/public',
  dst:__dirname + '/public'})
    );
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', controller.index);
app.get('/user/:id', controller.user);
app.post('/add', controller.add);
app.post('/subscribe', controller.subscribe);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
