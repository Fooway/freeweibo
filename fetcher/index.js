/*
 * this deamon process runs in background to fetch user's tweets
 * */

var fs = require('fs');
var api = require('./api')();
var async = require('async');
var debug = require('debug')('fetcher');

// mongodb model
var model = {};
var DELETE_INTERVAL_BY_DATE = 14;
var FETCH_INTERVAL_BY_MINUTE = 15; 
var CHECK_INTERVAL_BY_MINUTE = 30;
var API_REQUEST_INTERVAL_BY_SEC = 1;

function timeConfig(option) {
  var tmp;
  (tmp = option.delete_interval_days) ? (DELETE_INTERVAL_BY_DATE = tmp):null;
  (tmp = option.fetch_interval_mins) ? (FETCH_INTERVAL_BY_MINUTE = tmp):null;
  (tmp = option.check_interval_mins) ? (CHECK_INTERVAL_BY_MINUTE = tmp):null;
  (tmp = option.api_request_interval_secs) ? (API_REQUEST_INTERVAL_BY_SEC = tmp):null;
}

var fetcher = module.exports = {
  init: function (db, config) {
    if (!db) { return; }
    model = db;
    (config) ? timeConfig(config):null;

    fetch();
    check();
  },

  fetchTweet: fetchTweet,

  fetchUser: function(option, cb) {
    model.User.find(option, function(err, user) {
      if (err) {
        debug(err);
        cb(err);
        return;
      }
      if (!user.length) { 
        api.getUserInfo(option, function(err, user) {
          if (err || user.error) {
            var error = err || user.error;
            debug(error);
            cb(error);
          } else {
            var newuser = new model.User({
              name: user.screen_name, 
              uid: user.id,
              img_url: user.profile_image_url,
              latest_tid: 0,
              location: user.location,
              description: user.description,
              gender: user.gender,
              followers_cnt: user.followers_count,
              friends_cnt: user.friends_count,
              tweets_cnt: user.statuses_count
            });
            newuser.save(function (err, user) { 
              if (err) {
                debug(err);
                cb(err);
              } else {
                cb(null, newuser);
              }
            });
          }
        });
      }
      cb(null, user);
    });

  }
}

// check all the tweets' status in db.
function check() {
  model.Tweet.find({status: 0})
    .select('tid')
    .exec(function(err, tweets) {
      function done(results) {
        setTimeout(check, CHECK_INTERVAL_BY_MINUTE * 60 * 1000);
      }

      function update_status (err, response, tweet) {
        if ((response.error) &&(
           (response.error_code == 20132) ||
           (response.error_code == 20135))) {
          model.Tweet.update({tid: tweet.tid},
              {status: 1}, function() {});
          debug('tweet ' + tweet.tid + ' unavailabe');
          fetcher.fetchUser({uid: tweet.user.id});
        } else {
          debug(tweet.tid + ' status ok');
          deleteOld(tweet);
        }
      }

      async.eachSeries(tweets, function(tweet, cb) {
        // need to delay 1s for each tweet
        // so we will not exceed the api access frequency
        // otherwise, weibo will block our access temporarily
        setTimeout(function() {
          api.getTweetById(tweet.tid, function(err, data) {
            update_status(err, data, tweet); cb();
          });
        }, API_REQUEST_INTERVAL_BY_SEC * 1000);
      }, done);
  });
}

// fetch tweets for users
function fetch() {
  model.User.find(function(err, users) {
    if (err) {
      debug(err.message);
      return;
    }
    async.eachSeries(users, function(user, cb) {
      setTimeout(function() { 
        fetchTweets(user);
        cb();
      }, API_REQUEST_INTERVAL_BY_SEC * 1000);
    }, function(results) {
      setTimeout(fetch, FETCH_INTERVAL_BY_MINUTE * 60 * 1000);
    });
  });
}

// api get wrapper for getting user's latest tweets
function fetchTweets(user) {
  api.getUserTweets({uid: user.uid, since_id: user.latest_tid}, function(err, tweets) {
    if (err || !tweets || !tweets.length) { 
      if (err) {
      debug(err);
      } else {
        debug('no new tweet for [' + user.name + ']');
      }
      return;
    }

    debug('fetched ' + tweets.length + ' tweets for ' + user.name);
    model.User.update({uid: user.uid}, {latest_tid: tweets[0].id}, function(err) {
      if (err) { 
        debug(err.mesage);
      }
    });

    async.each(tweets, function(tweet, cb){
      model.Tweet.find({tid: tweet.id}, function(err, old) {
        if (err || old == []) {
          saveTweet(tweet, false);
        } else {
          debug('tweet [' + tweet.id + '] already exists, skip!');
        }
        cb();
      });
    }, function(results){});
  });
}


function saveTweet(tweet, retweet) {
  var origin_tweet = tweet.retweeted_status;
  var uid = 0;
  var name = '';

  if (!tweet) return;

  if (tweet.user) {
    var uid = tweet.user.id;
    var name = tweet.user.screen_name;
    var img = tweet.user.profile_image_url;
  }
  // create must have a callback function
  api.getImage(tweet, function(err, image_name) {
    model.Tweet.create({
      tid: tweet.id,
      status: 0,
      retweet: retweet,
      create_at: (new Date(tweet.created_at)).valueOf(),
      text: tweet.text,
      origin_pic_url: tweet.original_pic || '', 
      user_id: uid,
      user_name: name,
      user_img: img,
      pic_name: image_name,
      origin_tweetid:  (origin_tweet?origin_tweet.id:0),
      comments_count: tweet.comments_count,
      reposts_count: tweet.reposts_count
    }, function(err, tweet) {
      if (err) {
        debug('error: ' + err);
      }
    });
  });

  if (origin_tweet) {
    saveTweet(origin_tweet, true);
  }
}

function deleteOld(tweet) {
  var now = (new Date()).valueOf();

  debug('deleting tweet: ' + tweet.id);

  if ((tweet.create_at - now) > DELETE_INTERVAL_BY_DATE * 24 * 60 * 60 * 1000) {
    var files = api.imagePath(tweet.image_name);

    for (var i = 0; i < files.length; i++) {
      fs.unlink(files[i]);
    };
    model.Tweet.remove({tid: tweet.tid});
  }
}
