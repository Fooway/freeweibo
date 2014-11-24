
/*
 * this module provide methods for https api access to weibo 
 * */

var fs = require('fs');
var https = require('https');
var os = require('os');
var request = require('request');
var querystring = require('querystring');
var extend = require('extend');
var async = require('async');
var path = require('path');
var mkdirp= require('mkdirp');
var log = require('../app/log');

var IPs = { v4:[], v6:[]};

getInterfaceAddress();

var account = { 
  AppIds: [
    3364683177,
    3123403167,
    2421323772,
    138507463,
    79071089,
    1628998857,
    92384490,
    3694877555,
    953840599,
    2876251236
  ]
};

// api interfaces
var api = {
  host:  'api.weibo.com', 
  localAddress: IPs.v6[0] || IPs.v4[0],
  user_tweets: {
    url: "/2/statuses/user_timeline.json",   // get a user's tweets by uid or screen_name
    param: {
      screen_name: account.screen_name,
      count: 10,                  // returned  number of tweets
      since_id: 0
      //trim_user: 1
    }
  },

  get_tweet:  {    // get a tweet by id
    url: "/2/statuses/show.json", 
    param: {}
  },

  get_friends: {  // get friends tweets
    url: "/2/statuses/home_timeline.json", 
    param: {}
  },

  add_friend: {
    url: "/2/friendships/create.json",
    param: {}
  },

  get_user:  {    // get user by id
    url: "/2/users/show.json" ,
    param: {}
  }    

};

module.exports = function() {

  var img_dir = ''; 
  var imagePath = function (basename) {
    var files = [];
    if (!img_dir) {
      img_dir = path.normalize(path.join(__dirname, '../public/images/tweets/'));
      mkdirp.sync(img_dir);
    }
    if (basename) {
      var image_path = path.normalize(path.join(img_dir, basename));

      files.push(image_path + '_thumb.jpg');
      files.push(image_path + '_middle.jpg');
      files.push(image_path + '_large.jpg');
    }
    return files;
  };

  // change app key every 3 mins.
  var keyIndex = 0;
  function changeAppKey() {
    account.source = account.sources[keyIndex];
    keyIndex = (++keyIndex)%10; 
    setTimeout(changeAppKey, 3*60*1000);
  }

  setTimeout(changeAppKey, 3*60*1000);

  return {
    // get user's tweets by user
    getUserTweets: function(option /* id or name */, callback) {
      if (typeof option == 'function') {
        callback = option;
        option = {};
      }
      get(generateUrl('user_tweets', option), function(error, data) { 
        if (error)  {
          callback(error);
          return;
        }
        callback(null, data.statuses);
      });
    },

    getFriendTweets: function(option /* uid or name */, callback) {
      if (typeof option == 'function') {
        callback = option;
        option = {};
      }
      get(generateUrl('get_friends', option), function(error, data) { 
        if (error)  {
          callback(error);
          return;
        }
        callback(null, data.statuses);
      });
    },

    addFriend: function(option /* uid or name */, callback) {
      if (typeof option == 'function') {
        callback = option;
        option = {};
      }
      post(generateUrl('add_friend', option), function(error, data) { 
        if (error)  {
          callback(error);
          return;
        }

        if (data.error) {
          callback(data.error);
          return;
        }

        callback(null, data);
      });
    },

    // get a tweet by tweet id
    getTweetById: function(id, callback) {
      get(generateUrl('get_tweet', {id: id}), function(error, data) { 
        if (error) { 
          callback(error);
          return;
        }
        callback(null,data);
      });

    },

    // get user info by screen_name or uid
    getUserInfo: function(option, callback) {
      get(generateUrl('get_user', option), function(error, data) { 
        if (error) { 
          callback(error);
          return;
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
          request(item.remote,
                  function (error, response, body) {
                    if(error){
                      log.error(error);
                    }
                  }).pipe(fs.createWriteStream(item.local));
                  cb();
        }, function(results) {
          log.info('file ' + base_name + ' save done!');
        });

      } else {
        callback(null, '');
      }

    },

    imagePath: imagePath,

    setLog: function(log_para) {
      log = log_para;
    }

  }
};

// request api function
function get(url, callback) {
 https.get('https://' + api.host + url, function(res) {
    var chunks = [];
    res.on('data', function(chunk) { chunks.push(chunk); });
    res.on('end', function() {
      var buffer = Buffer.concat(chunks);
      try {
        data = JSON.parse(buffer.toString());
      } catch (e) {
        chunks = [];
        buffer = [];
        log.error(e.stack);
        callback(e, null);
        return;
      }

      // debug point
      callback(null, data);

      buffer = [];
      chunks = [];
    })
  }).on('error', function(e) {
    callback(e, null);
  });
}

function post(url, callback) {
  var data = url.split('?');

  // An object of options to indicate where to post to
  var options = {
    host: api.host,
    path: data[0],
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': data[1].length
    }
  };

  // Set up the request
  var req = https.request(options, function(res) {
    var chunks = [];
    res.on('data', function(chunk) { chunks.push(chunk); });
    res.on('end', function() {
      var buffer = Buffer.concat(chunks);
      try {
        data = JSON.parse(buffer.toString());
      } catch (e) {
        chunks = [];
        buffer = [];
        log.error(e.stack);
        callback(e, null);
        return;
      }

      // debug point
      callback(null, data);

      buffer = [];
      chunks = [];
    })
  }).on('error', function(e) {
    callback(e, null);
  });

  // post the data
  req.end(data[1]);
}

function generateUrl(method, option) {
  var param = extend({}, api[method].param, option);

  param.source = account.source;
  param.access_token = account.access_token;

  if (param.uid && param.screen_name) {
    delete param.screen_name;
  }
  // override
  return api[method].url + '?' + querystring.stringify(param);
}

function getInterfaceAddress() {
  var interfaces = os.networkInterfaces();
  for (name in interfaces) {
    if (name.match(/^(en|eth)\d/)) {
      for (k in interfaces[name]) {
        var item = interfaces[name][k];
        if (item.family == 'IPv4' && !item.internal &&
            !item.address.match(/^10\./)) {
          IPs.v4.push(item.address)
        }
        if (item.family == 'IPv6' && !item.internal && 
            !item.address.match(/^fe80/i)) {
          IPs.v6.push(item.address)
        }
      }
    }
  }
}
