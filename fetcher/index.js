/*
 * this deamon process runs in background to fetch user's tweets
 * */

var fs = require('fs');
var api = require('./api');
var async = require('async');

// mongodb model
var model = {};

fetcher = module.exports = function (db) {
  if (!db) { return; }
  model = db;
  fetch();
  check();
}

// check all the tweets' status in db.
function check() {
  model.Tweet.find({status: 0})
    .select('tid')
    .exec(function(err, tweets) {
    // body...
      console.log('number:' + tweets.length);
      function done(results) {
        console.log('done...');
        setTimeout(check, 30*60*1000);
      }

      function update_status (err, response, tweet) {
        // body...
        console.log('begin update...');
        if ((response.error) &&(
           (response.error_code == 20132) ||
           (response.error_code == 20135))) {
          model.Tweet.update({tid: tweet.tid},
              {status: 1}, function() {});
          console.log(tweet.tid + ' unavailabe');
        } else {
          console.log(tweet.tid + ' status ok');
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
        }, 1000);
      }, done);
  });
}

// fetch tweets for users
function fetch() {
  model.User.find(function(err, users) {
    if (err) {
      console.log(err.message);
      return;
    }
    async.eachSeries(users, function(user, cb) {
      setTimeout(function() { 
        fetchTweets(user);
        cb();
      }, 1000);
    }, function(results) {
      setTimeout(fetch, 3*60*1000);
    });
  });
}

// api get wrapper for getting user's latest tweets
function fetchTweets(user) {
  api.getUserTweets({uid: user.uid, since_id: user.latest_tid}, function(err, tweets) {
    if (err || !tweets || !tweets.length) { 
      if (err) {
      console.log(err);
      } else {
        console.log('no new tweet for [' + user.name + ']');
      }
      return;
    }

    console.log('fetched ' + tweets.length + ' tweets for ' + user.name);
    model.User.update({uid:user.uid}, {latest_tid: tweets[0].id}, function(err) {
      if (err) { 
        console.log(err.mesage);
      }
    });

    for (var i = 0; i < tweets.length; i++) {
      saveTweet(tweets[i], false);
    };
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
      pic_name: image_name,
      origin_tweetid:  (origin_tweet?origin_tweet.id:0),
      comments_count: tweet.comments_count,
      reposts_count: tweet.reposts_count
    }, function(err, tweet) {
      if (err) {
        console.log('save err!');
      }
    });
  });

  if (origin_tweet) {
    saveTweet(origin_tweet, true);
  }
}

