/*
 * this module provide methods for https api access to weibo 
 * */

var fs = require('fs');
var request = require('request');
var querystring = require('querystring');
var extend = require('extend');
var async = require('async');
var path = require('path');
var mkdirp= require('mkdirp');
var log = require('../app/log');
var config = require('./config');

var host = 'https://api.weibo.com';
var img_dir = path.normalize(path.join(__dirname, '../public/images/tweets/'));
// create directories
mkdirp.sync(img_dir);

var account = { 
  screen_name: config.key_user,
  source: ''
};

// api interfaces
var interface = {
  // get a user's tweets by uid or screen_name
  user_tweets: {
    url: "/2/statuses/home_timeline.json", 
    param: {
      count: 10,
      since_id: 0
    }
  },

  get_tweet:  {    // get a tweet by id
    url: "/2/statuses/show.json", 
    param: {}
  },

  add_friend: {
    url: "/2/friendships/create.json",
    param: {}
  },

  remove_friend: {
    url: "/2/friendships/destroy.json",
    param: {}
  },

  get_user:  {    // get user by id
    url: "/2/users/show.json" ,
    param: {}
  }    
};

function imagePath (basename) {
  var files = [];
  if (basename) {
    var image_path = path.normalize(path.join(img_dir, basename));

    files.push(['_thumb.jpg', '_middle.jpg', '_large.jpg'].map(function (pfx) {
      image_path + pfx;
    }));
  }
  return files;
}

var keyIndex = 0;

function changeAppID() {
  account.source = config.APP_IDS[keyIndex];
  keyIndex = (++keyIndex) % config.APP_IDS.length; 
  // change app id every 3 mins.
  setTimeout(changeAppID, 3*60*1000);
}

changeAppID();

// request api function
function get(url, callback) {
 request.get('https://' + api.host + url, function(err, resp, data) {
   if (err || resp.statusCode !== 200) {
     callback(err || 'statusCode: ' + resp.statusCode, null);
   } else {
     callback(null, data);
   }
  });
}

function post(url, data, callback) {

  // An object of options to indicate where to post to
  var options = {
    url: api.host + url,
    form: data,
  };

  request.post(options, function (err, resp, body) {
   if (err || resp.statusCode !== 200) {
     callback(err || 'statusCode: ' + resp.statusCode, null);
   } else {
     callback(null, data);
   }
  });
}

function generateUrl(method, option) {
  var param = extend({}, api[method].param, option);

  param.source = account.source;

  if (param.uid && param.screen_name) {
    delete param.screen_name;
  }
  // override
  return api[method].url + '?' + querystring.stringify(param);
}

module.exports = {
  // get user's tweets by user
  getTweets: function(sid, callback) {
    get(generateUrl('user_tweets', {since_id: sid}), function(error, data) { 
      if (error)  {
        return callback(error);
      }
      callback(null, data.statuses);
    });
  },

  addFriend: function(option /* uid or name */, callback) {
    post(generateUrl('add_friend', {}), option, function(error, data) { 
      if (error)  {
        return callback(error);
      }
      callback(null, data);
    });
  },


  removeFriend: function(option /* uid or name */, callback) {
    post(generateUrl('remove_friend', {}), option, function(error, data) { 
      if (error)  {
        return callback(error);
      }
      callback(null, data);
    });
  },

  // get a tweet by tweet id
  getTweetById: function(id, callback) {
    get(generateUrl('get_tweet', {id: id}), function(error, data) { 
      if (error) { 
        return callback(error);
      }
      callback(null,data);
    });
  },

  // get user info by screen_name or uid
  getUser: function(option, callback) {
    get(generateUrl('get_user', option), function(error, data) { 
      if (error) { 
        return callback(error);
      }
      callback(null,data);
    });
  },

  getImage: function(tweet, callback) {
    if (tweet.original_pic) {
      var regex = /\/([^\/.]+)(\.[\w]+)?$/;
      var base_name ; 
      try {
        base_name = regex.exec(tweet.original_pic)[1];
      } catch(e) {
        log.error('PIC_MATCH_FAIL:' + tweet.original_pic);
        base_name = 'pic_match_fail_' + tweet.original_pic.substr(-6, 5);
      }

      var local_path = imagePath(base_name);
      var files = []; 

      callback(null, base_name);

      files.push([{
        local: local_path[0], 
        remote: tweet.original_pic.replace('large', 'thumbnail')
      },
      {
        local: local_path[1],
        remote: tweet.original_pic.replace('large', 'bmiddle')
      },
      {
        local: local_path[2],
        remote: tweet.original_pic
      }]);

      async.map(files, function(item, cb) {
        request(item.remote,
                function (error, response, body) {
                  log.error(error);
                  cb();
                }).pipe(fs.createWriteStream(item.local));
      }, function(results) {
        log.info('file ' + base_name + ' save done!');
      });

    } else {
      callback(null, '');
    }
  },

  imagePath: imagePath
};

