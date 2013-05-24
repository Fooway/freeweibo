
/**
 * Module dependencies.
 */

var express = require('express');
var http = require('http');
var path = require('path');
var fetcher = require('./fetcher');
var config = require('./config');
var controller = require('./app/controller')(fetcher);

// first, boot fetcher
fetcher.init(controller.db, config);

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
app.post('/', controller.initData);
app.post('/add', controller.add);
app.post('/subscribe', controller.subscribe);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
