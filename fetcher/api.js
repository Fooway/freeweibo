
/*
 * this module provide methods for https api access to weibo 
 * */

var fs = require('fs');
var https = require('https');
var request = require('request');
var querystring = require('querystring');
var extend = require('extend');
var async = require('async');
var path = require('path');
var debug = require('debug')('api');

var account = { 
  screen_name: "不停跳",
  source: 2442636523,
  access_token: "2.00ZBLjNCR2D_fC8503c0c526b1L5EC",
};
// api interfaces
var api = {
  baseUrl: "https://api.weibo.com/2/",
  user_tweets: {
    url: "statuses/user_timeline.json",   // get a user's tweets by uid or screen_name
    param: {
      screen_name: account.screen_name,
      source: account.source,
      access_token: account.access_token,
      count: 10,                  // returned  number of tweets
      since_id: 0
      //trim_user: 1
    }
  },

  get_tweet:  {    // get a tweet by id
    url: "statuses/show.json", 
    param: {
      source: account.source,
      access_token: account.access_token
    }
  },

  get_user:  {    // get user by id
    url: "users/show.json" ,
    param: {
      source: account.source,
      access_token: account.access_token
    }
  }    

};

module.exports = function() {

 var imagePath = function(basename) {
    var files = [];
    if (basename) {
      var image_path = path.normalize(path.join(__dirname, '../public/images/tweets/', basename));

      files.push(image_path + '_thumb.jpg');
      files.push(image_path + '_middle.jpg');
      files.push(image_path + '_large.jpg');
    }
    return files;
  };

  
 return {
   // get user's tweets by user
   getUserTweets: function(option /* id or name */, callback) {
     if (typeof option == 'function') {
       callback = option;
       option = {};
     }
     get(generateUrl('user_tweets', option), function(err, data) { 
       if (err || !data.statuses)  {
         callback(err);
         return;
       }
       callback(null, data.statuses);
     });
   },

     // get a tweet by tweet id
     getTweetById: function(id, callback) {
       get(generateUrl('get_tweet', {id: id}), function(err, data) { 
         if (err) { 
           callback(err, null);
           return;
         }
         callback(null,data);
       });

     },

     // get user info by screen_name or uid
     getUserInfo: function(option, callback) {
       get(generateUrl('get_user', option), function(err, data) { 
         if (err) { 
           callback(err);
           return;
         }
         callback(null,data);
       });
     },

     getImage: function(tweet, callback) {
       if (tweet.original_pic) {
         var regex = /\/([^\/]+)\.[\w]+$/;
         var base_name = regex.exec(tweet.original_pic)[1];
         var local_path = imagePath(base_name);
         var files = []; 

         callback(null, base_name);

         files.push({
           local: local_path[0], 
           remote: tweet.original_pic.replace('large', 'thumbnail')
         });
         files.push({
           local: local_path[1],
           remote: tweet.original_pic.replace('large', 'bmiddle')
         });
         files.push({
           local: local_path[2],
           remote: tweet.original_pic
         });

         async.map(files, function(item, cb) {
           request(item.remote, function (error, response, body) {
             if(error){
               console.error('error: '+ error);
             }
           }).pipe(fs.createWriteStream(item.local));
           cb();
         }, function(results) {
           debug('file ' + base_name + ' save done!');
         });

       } else {
         callback(null, '');
       }

     },
     imagePath: imagePath
 }
};

// request api function
function get(url, callback) {
  debug('[ '+ (new Date()).toLocaleTimeString() + ' ] >> GET: ' + url);
  https.get(url, function(res) {
    var buffers = [];
    res.on('data', function(chunk) { buffers.push(chunk); });
    res.on('end', function() {
      var buffer = Buffer.concat(buffers);
      data = JSON.parse(buffer.toString());
      // debug point
      debug(buffer.toString());

      callback(null, data);
      buffer = [];
    })
  }).on('error', function(e) {
    console.error('error: ' + e);
    callback(e, null);
  });
}


function generateUrl(method, option) {
  var param = extend({}, api[method].param, option);

  if (param.uid && param.screen_name) {
    delete param.screen_name;
  }
  // override
  return api.baseUrl + api[method].url +
    '?' + querystring.stringify(param);
}

