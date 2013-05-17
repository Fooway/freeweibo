/*
 * this deamon process run in background to fetch user's tweets
 * */

var fs = require('fs');
var api = require('./api');
var model = require('../app/model');

