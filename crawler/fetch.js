/*
 * fetch task for crawler
 * */
var api = require('./api')();
var async = require('async');
var model = require('../app/model')();

// fetch tweets for users
function fetch() {
  log.info('start fetch...');
  model.User.find({name: 'freeman2013_28472'}, function(error, users) {
    if (error) {
      setTimeout(fetch, FETCH_INTERVAL_BY_MINUTE * 60 * 1000);
      return;
    }

    if (users.length == 0) {
      model.User.create({
        name: 'freeman2013_28472',
        uid: 432784392,
        latest_tid: 0
      }, function(error, user) {
        fetchTweets(user.latest_tid, function() {
          setTimeout(fetch, FETCH_INTERVAL_BY_MINUTE * 60 * 1000);
        });
      });
    } else {
      fetchTweets(users[0].latest_tid, function() {
          setTimeout(fetch, FETCH_INTERVAL_BY_MINUTE * 60 * 1000);
      });
    }
  });
}

// api get wrapper for getting user's latest tweets
function fetchTweets(tid, callback) {
    api.getFriendTweets({since_id: tid}, function(error, tweets) {
      if (error) { 
        log.error(error);
        callback();
        return;
      }
      if (!tweets || !tweets.length) {
        log.info('no new tweets.');
        callback();
        return;
      }

      log.info('fetched ' + tweets.length + ' tweets.');

      model.User.update({name: 'freeman2013_28472'}, {latest_tid: tweets[0].id}, function() {});
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
    return cb();
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

          if (user.followers_count > 1000) {
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
              api.addFriend({uid: tweet.user_id}, function(error, friend) {
                log.info('add friend [' + friend.screen_name + '] successful!');
              });

            });

          } else {
            cb('not enough followers!');
          }
        }
      });
    } else {
      cb('user already exists!');
    }
  });

}
