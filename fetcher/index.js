/*
 * this deamon process runs in background to fetch user's tweets
 * */

var fs = require('fs');
var api = require('./api')();
var async = require('async');

// mongodb model
var model = {};
var log;
var tweeters = [];
var DELETE_INTERVAL_BY_DATE = 20;
var FETCH_INTERVAL_BY_MINUTE = 1; 
var CHECK_INTERVAL_BY_MINUTE = 66;
var API_REQUEST_INTERVAL_BY_SEC = 2;
var CHECK_SELECT_TWEETS_DATE = 10;
var FOLLOWER_THRESHOLD = 200000;

function timeConfig(option) {
  var tmp;
  (tmp = option.delete_interval_days) ? (DELETE_INTERVAL_BY_DATE = tmp):null;
  (tmp = option.fetch_interval_mins) ? (FETCH_INTERVAL_BY_MINUTE = tmp):null;
  (tmp = option.check_interval_mins) ? (CHECK_INTERVAL_BY_MINUTE = tmp):null;
  (tmp = option.api_request_interval_secs) ? (API_REQUEST_INTERVAL_BY_SEC = tmp):null;
  (tmp = option.check_select_tweets_days) ? (CHECK_SELECT_TWEETS_DATE= tmp):null;
  (tmp = option.follower_threshold) ? (FOLLOWER_THRESHOLD = tmp):null;
}

var fetcher = module.exports = function (db, config) {
  if (!db) { return; }
  model = db;
  if (config) {
    timeConfig(config.option);
    tweeters = config.tweeters;
    log = config.log;
    api.setLog(log);
  }

  fetch();
  check();
  deleteOld();

  return {
    addUser: fetchUser
  };
};



// check all the tweets' status in db.
function check() {
  log.info('start check... ');
  var now = (new Date()).valueOf();
  model.Tweet.find({status: 0}).where('create_at').gt(now - CHECK_SELECT_TWEETS_DATE * 24 * 60 * 60 * 1000).
    sort('-create_at').
    select('tid attributed_uid user_id').
    exec(function(error, tweets) {
      function done(results) {
        setTimeout(check, CHECK_INTERVAL_BY_MINUTE * 60 * 1000);
      }

      function update_status (error, response, tweet) {
        if (!response) return;
        if ((response.error) &&(
           (response.error_code == 20112) || //由于作者隐私设置，你没有权限查看此微博
           (response.error_code == 20132) || //抱歉，该内容暂时无法查看。如需帮助，请联系客服
           (response.error_code == 20135))) { //源微博已被删除
          // update tweet status
          model.Tweet.update({tid: tweet.tid},
              {status: 1, delete_time: (new Date()).valueOf()}, function() {});
          // increment users delete_attribute
          model.User.update({uid: tweet.attributed_uid},
            {$inc:{delete_attributed:1}}, {upsert: false},function(){});
          log.info('tweet ' + tweet.tid + ' unavailabe');
          fetchUser({uid: tweet.user_id}, function(){});
        }
        if (response.id) {
          model.Tweet.update(
            { tid: tweet.tid }, 
            {
              reposts_count: response.reposts_count,
              comments_count: response.comments_count
            }, function(){});
        }
      }

      async.eachSeries(tweets, function(tweet, cb) {
        // need to delay 1s for each tweet
        // so we will not exceed the api access frequency
        // otherwise, weibo will block our access temporarily
        setTimeout(function() {
          log.info('checking tweet [ ' + tweet.tid + ']... ');
          api.getTweetById(tweet.tid, function(error, data) {
            if (!error) {
              update_status(error, data, tweet); 
            }
            cb();
          });
        }, API_REQUEST_INTERVAL_BY_SEC * 1000);
      }, done);
  });
}

// fetch tweets for users
function fetch() {
  log.info('start fetch...');
  model.User.find(function(error, users) {
    if (error) {
      console.error(error.message);
      return;
    }
    if (users.length == 0) {
      log.info('initialize tweeters...');
      async.eachSeries(tweeters, function(tweeter, cb) {
        // need to delay for each tweet
        // so we will not exceed the api access frequency
        // otherwise, weibo will block our access temporarily
        setTimeout(function() {
          fetchUser({name: tweeter}, function() { cb();});
        }, API_REQUEST_INTERVAL_BY_SEC * 1000);
      }, function() {
        setTimeout(fetch, 10 * 1000);
      });
      return;
    }
    async.eachSeries(users, function(user, cb) {
      setTimeout(function() { 
        log.info('fetching user [ ' + user.name + ']... ');
        fetchTweets(user, function() {
          cb();});
      }, API_REQUEST_INTERVAL_BY_SEC * 1000);
    }, function(results) {
      setTimeout(fetch, FETCH_INTERVAL_BY_MINUTE * 60 * 1000);
    });
  });
}

// api get wrapper for getting user's latest tweets
function fetchTweets(user, callback) {
  api.getUserTweets({uid: user.uid, since_id: user.latest_tid}, function(error, tweets) {
    if (error) { 
      callback();
      return;
    }
    if (tweets && !tweets.length) {
      log.info('no new tweets.');
      callback();
      return;
    }

    log.info('fetched ' + tweets.length + ' tweets.');
    model.User.update({uid: user.uid}, {latest_tid: tweets[0].id}, function(error) {
      if (error) { 
        log.error(error);
      }
    });

    async.eachSeries(tweets, function(tweet, cb){ 
      saveTweet(tweet, cb);
    }, function(results){
      callback();
      tweets = {};
    });
  });
}


function saveTweet(tweet, cb) {
  var uid = 0;
  var name = '';

  if (!tweet) {
    cb();
    return;
  }

  var attributed = tweet.user.id;
  // only save original tweet
  if (tweet.retweeted_status) {
    tweet = tweet.retweeted_status;
  }

  if (tweet.user) {
    var uid = tweet.user.id;
    var name = tweet.user.screen_name;
    var img = tweet.user.profile_image_url;
  }

  model.Tweet.find({tid: tweet.id}, function(error, old) {

    if (error || old.length == 0) {
      api.getImage(tweet, function(error, image_name) {

        var time;
        try {
          time = new Date(tweet.created_at);
        } catch(e) {
          log.error(e);
          time  = new Date();
        }

        model.Tweet.create({
          tid: tweet.id,
          status: 0,
          create_at: time.valueOf(),
          delete_time: 0,
          sended: false,
          text: tweet.text,
          origin_pic_url: tweet.original_pic || '', 
          user_id: uid,
          user_name: name,
          user_img: img,
          pic_name: image_name,
          comments_count: tweet.comments_count,
          reposts_count: tweet.reposts_count,
          attributed_uid: attributed
        }, function(error, newtweet) {
          if (error) {
            log.error(error);
          }
          cb();
        });
      });
    } else {
      cb();
    }
  });
}

function deleteOld() {
  log.info('start deleting old tweets...');
  var now = (new Date()).valueOf();

  // first, remove all old tweets with no image
  model.Tweet.find({status: 0}).
   where('create_at').lt(now - DELETE_INTERVAL_BY_DATE * 24 * 60 * 60 * 1000).
   where('pic_name').equals('').
   remove(function() {});

  // then, remove all old tweets with image
  model.Tweet.find({status: 0}).
   where('pic_name').ne('').
   where('create_at').lt(now - DELETE_INTERVAL_BY_DATE * 24 * 60 * 60 * 1000).
   select('tid image_name').
   exec(function(error, tweets) {
    if (error) {
      log.error(error);
      setTimeout(deleteOld, 4*60*60*1000);
    } else {
      async.each(tweets, function(tweet, cb) {
        model.Tweet.remove({tid: tweet.tid}, function(){});
        var files = api.imagePath(tweet.image_name);

        log.info('deleting tweet: ' + tweet.tid);

        for (var i = 0; i < files.length; i++) {
          log.info('deleting ' + files[i]);
          fs.unlink(files[i]);
        };
        cb();
      }, function() { setTimeout(deleteOld, 8*60*60*1000);});
    }
    
  });
    
}

function fetchUser(option, cb) {
  model.User.find(option, function(error, user) {
    if (error) {
      log.error(error);
      cb(error);
      return;
    }
    if (!user.length) { 
      option.screen_name = option.name;
      delete option.name;
      api.getUserInfo(option, function(error, user) {
        if (error || (user && user.error)) {
          var error = error || user.error;
          log.error(error);
          cb(error);
        } else {
          log.info('add ' + user.screen_name + ', has ' +
                   user.followers_count + ' followers.');
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
            tweets_cnt: user.statuses_count,
            created_date: (new Date()).valueOf()
          });
          newuser.save(function (error, user) { 
            if(error) { 
              log.error(error);
              cb(error);
            } else {
              cb(null, user);
            }
          });
        }
      });
    }
  });

}
