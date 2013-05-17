/*
 * this deamon process run in background to fetch user's tweets
 * */

var fs = require('fs');
var https = require('https');
var querystring = require('querystring');

var buffers = [];
// weibo api url 
var baseApi = "https://api.weibo.com/2/statuses/";

// api interfaces
var interface = {

  UserTL: {
    url: "user_timeline.json",   // get a user's tweets by uid or screen_name
    param: {
      count: 1,                  // returned  number of tweets
      since_id: 0,
      trim_user: 1
    }
  },

  Show:  { url: "show.json" }    // get a tweet by id   

};

var appInfo = { 
  screen_name: "不停跳",
  source: 2442636523,
  access_token: "2.00ZBLjNCR2D_fC8503c0c526b1L5EC",
  count: 1,                  // returned  number of tweets
  since_id: 0,
  trim_user: 1
};

https.get(baseApi + interface.UserTL.url + "?" + querystring.stringify(appInfo), function(res) {
  res.on('data', function(chunk) {
    buffers.push(chunk);
  });
  res.on('end', function() {
    var buffer = Buffer.concat(buffers);
    data = JSON.parse(buffer.toString());
    console.log(buffer.toString());
    for (var i = 0; i < data.statuses.length; i++) {
      console.log(data.statuses[i].created_at);
      console.log(data.statuses[i].id);
      console.log(data.statuses[i].text);
    };

  });
}).on('error', function(e) {
  console.log("Got error: " + e.message);
});

