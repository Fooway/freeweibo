
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

var IPs = { v4:[], v6:[]};

getInterfaceAddress();

var account = { 
  screen_name: "不停跳",
  source: 2792117054,
  access_token: "2.00ZBLjNCCM8xCD7abb61ca7b03VNAl",
  tokens: [
    "2.00ZBLjNCCM8xCD7abb61ca7b03VNAl",
    "2.00ZBLjNC0a21C4d7fe3327355YekJB",
    "2.00ZBLjNCV1_tFB592d9b94c00a4Cjj",
    "2.00ZBLjNCrOvlSE0c33f283950Ps5iZ",
    "2.00ZBLjNC0JQOf7d9858deffa0TO2cU",
    "2.00ZBLjNC09Ffk6a4387785704fDtXD",
    "2.00ZBLjNCPDfDGC04d3053333P3P2QE",
    "2.00ZBLjNCZAQEZDa6a3cbc1d114lKCC",
    "2.00ZBLjNCP6qq8Ede113c52c6DbkRwC",
    "2.00ZBLjNC8MBc7Ea22fcf780a7UdgSE",
  ],
  sources: [
    2792117054,
    340410602,
    1003196859,
    3941926821,
    394011001,
    380529430,
    1921796469,
    3266585107,
    4076086909,
    4057777143
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

  get_user:  {    // get user by id
    url: "/2/users/show.json" ,
    param: {}
  }    

};

module.exports = function() {

  var img_dir = ''; 
  var imagePath = function(basename) {
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
    account.access_token = account.tokens[keyIndex];
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
          request(item.remote,
                  {localAddress:IPs.v6[0] || IPs.v4[0]}, 
                  function (error, response, body) {
                    if(error){
                      console.error('[' + (new Date()).toLocaleString('en-US') + '] ' + error);
                    }
                  }).pipe(fs.createWriteStream(item.local));
                  cb();
        }, function(results) {
          console.log('file ' + base_name + ' save done!');
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
  console.log('[ '+ (new Date()).toLocaleTimeString() + ' ] >> GET: ' + url);
  https.get({
    host: api.host,
    localAddress: api.localAddress,
    path: url
  }, function(res) {
    var buffers = [];
    res.on('data', function(chunk) { buffers.push(chunk); });
    res.on('end', function() {
      var buffer = Buffer.concat(buffers);
      data = JSON.parse(buffer.toString());
      // debug point
      //console.log(buffer.toString());

      callback(null, data);
      buffer = [];
    })
  }).on('error', function(e) {
    console.error('[' + (new Date()).toLocaleString('en-US') + '] ' + e);
    callback(e, null);
  });
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
  var addresses = [];
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
