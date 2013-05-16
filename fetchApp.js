/*
 * this deamon process run in background to fetch user's tweets
 * */

var fs = require('fs');
var http = require('http');

var user = encodeURIComponent("不停跳");
http.get("http://api.weibo.com/2/statuses/user_timeline.json?source=2442636523&screen_name=" + user, function(res) {
  console.log(user);
  console.log("Got response: " + res.statusCode);
  console.log(res.body);
}).on('error', function(e) {
  console.log("Got error: " + e.message);
});

