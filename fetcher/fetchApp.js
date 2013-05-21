/*
 * this deamon process runs in background to fetch user's tweets
 * */

var fs = require('fs');
var api = require('./api');
var model = require('../app/model')();

function worker() {
  fetcher();
  setTimeout(worker, 60000);
}

(function () {
  // body...
  model.User.find(function(err, user) {
    if (user.length == 0) {
      model.User.create({name: '不停跳', uid: 2035125173}, worker);
    } else {
      worker();
    }
  });
})();


function fetcher() {
  readUsers(fetchTweets);
}

function readUsers(callback) {
  // body...
  model.User.find(function(err, users) {
    if (err) {
      console.log(err.message);
      return;
    }
    for (var i = 0; i < users.length; i++) {
      callback(users[i]);
    };
  });
}

function fetchTweets(user) {
  // body...
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
      saveTweet(tweets[i]);
    };
  });
}


function saveTweet(tweet) {
  var origin_tweet = tweet.retweeted_status;

  if (!tweet) return;

  // create must have a callback function
  model.Tweet.create({
    tid: tweet.id,
    create_at: tweet.created_at,
    text: tweet.text,
    pic_url:tweet.original_pic, 
    user_id: tweet.uid,
    pic_local_path: tweet.original_pic,
    origin_tweetid:  (origin_tweet?origin_tweet.id:0),
    comments_count: tweet.comments_count,
    reposts_count: tweet.reposts_count
  }, function(err, tweet) {
    if (err) {
      console.log('save err!');
    }
  });

  if (origin_tweet) {
    saveTweet(origin_tweet);
  }
}

