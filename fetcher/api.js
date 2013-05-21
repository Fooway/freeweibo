
/*
 * this module provide methods for https api access to weibo 
 * */

var fs = require('fs');
var https = require('https');
var querystring = require('querystring');
var extend = require('extend');

// api interfaces
var api = {
  account: { 
    screen_name: "不停跳",
    source: 2442636523,
    access_token: "2.00ZBLjNCR2D_fC8503c0c526b1L5EC",
  },
  baseUrl: "https://api.weibo.com/2/",
  user_tweets: {
    url: "statuses/user_timeline.json",   // get a user's tweets by uid or screen_name
    param: {
      count: 10,                  // returned  number of tweets
      since_id: 0,
      trim_user: 1
    }
  },

  get_tweet:  { url: "statuses/show.json" },    // get a tweet by id   
  get_user:  { url: "users/show.json" }    // get a tweet by id   

};

module.exports = {
  // get user's tweets by user
  getUserTweets: function(option /* id or name */, callback) {
    if (typeof option == 'function') {
      callback = option;
      option = {};
    }
    get(generateUrl('user_tweets', option), function(err, data) { 
      if (err || !data.statuses)  {
        callback(err);
        console.log(data);
        return;
      }
      for (var i = 0; i < data.statuses.length; i++) {
        console.log(data.statuses[i].created_at);
        console.log(data.statuses[i].id);
        console.log(data.statuses[i].text);
      };
      callback(null, data.statuses);
    });
  },

  // get a tweet by tweet id
  getTweetById: function(id, callback) {
    get(generateUrl('get_tweet', {id: id}), function(err, data) { 
      if (err) { return;}
      callback(null,data);
    });

  },

  // get user info by screen_name
  getUser: function(name, callback) {
    get(generateUrl('get_user', {screen_name: name}), function(err, data) { 
      if (err) { return;}
      callback(null,data);
    });
  }
};

// request api function
function get(url, callback) {
  console.log('GET: ' + url);
  https.get(url, function(res) {
    var buffers = [];
    res.on('data', function(chunk) { buffers.push(chunk); });
    res.on('end', function() {
      var buffer = Buffer.concat(buffers);
      data = JSON.parse(buffer.toString());
      // debug point
      console.log(buffer.toString());

      callback(null, data);
      buffer = [];
    })
  }).on('error', function(e) {
    console.log("Got error: " + e.message);
    callback(e);
  });
}


function generateUrl(method, option) {
  var param = extend({}, api.account, api[method].param, option);

  if (param.uid && param.screen_name) {
    delete param.screen_name;
  }
  // override
  return api.baseUrl + api[method].url +
    '?' + querystring.stringify(param);
}

