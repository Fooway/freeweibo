/*
 * fetch task for crawler
 * */
var api = require('./api');
var async = require('async');
var model = require('../app/model')();
var log = require('../app/log');

// getting key user's latest tweets
function fetchTweets() {
  log.info('start fetch...');

  var keyUser;
  var tweets;

  async.eachSeries([
    // get key user
    function (cb) {
      model.User.findOne({type: 'key_user'}, function (err, user) {
        keyUser = user;
        cb(err);
      });
    },
    // fetch new tweets
    function (cb) {
      api.getTweets(keyUser.latest_tid, function (error, resp) {
        if (error) { 
          log.error(error);
          cb(error);
        } else {
          tweets = resp;
          if (tweets[0]) keyUser.latest_tid = tweets[0].id;
          keyUser.save(function (err, doc) {
            log.error(err);
          });
          cb();
        } 
      });
    },
    // save tweets
    function (cb) {
      log.info('fetched ' + tweets.length + ' tweets.');
      async.eachSeries(tweets, function(tweet, cb){ 
        _saveTweet(tweet, cb);
      }, function(err){
        cb();
      });
    }
  ], function (err) {
    setTimeout(fetchTweets, config.TM);
  });

}


function _saveTweet(tweet, cb) {
  var uid = 0;
  var name = '';

  if (!tweet) return cb();

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

  model.Tweet.findOne({tid: tweet.id}, function(error, old) {
    if (error || old) return cb(err);

    api.getImage(tweet, function(error, image_name) {
      try {
        var time = new Date(tweet.created_at);
      } catch(e) {
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
        log.error(error);
        cb();
      });

    });
  });
}

// add new user to db and as friend of key user
function addUser(query, done) {
  var user;

  async.eachSeries([
    // check if exists in db
    function (cb) {
      model.User.findOne(query, function(error, user) {
        if (error || user) {
          cb(error || 'user already exists');
        } else {
          cb();
        }
      });
    },
    // get user info
    function (cb) {
      query.screen_name = option.name;
      delete query.name;

      api.getUser(query, function(error, resp) {
        if (error || (resp && resp.error)) {
          var error = error || resp.error;
          log.error(error);
          cb(error);
        } else {
          user = resp;
          cb();
        }
      });

    }
    // save user
    function (cb) {
      if (user.followers_count < config.USER_FOLLOW_MIN) {
        return cb('user followers count less than ' + config.USER_FOLLOW_MIN);
      }

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
        cb(error);
      });

      api.addFriend({uid: tweet.user_id}, function(error, friend) {
        log.info('add friend [' + friend.screen_name + '] successful!');
      });
    }
  ], function (err) {
    done(err);
  });
}

function removeUser(query, cb) {

  if (!cb) cb = function () {};

  model.User.fineOne(query, function (err, user) {
    if (err || !user) {
      return cb(err || 'user not exists');
    }

    user.remove(function () {
      api.removeFriend({uid: user.uid}, cb);
    });
  });
}

module.exports = {
  tweets: fetchTweets,
  user: addUser,
  remove: removeUser
};
