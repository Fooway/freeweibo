/*
 * this deamon process runs in background to fetch user's tweets
 * */

var fs = require('fs');
var api = require('./api');
var model = require('../app/model')();

function worker() {
  fetcher();
  setInterval(worker, 60000);
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
  api.getUserTweets({uid: user.uid}, function(err, tweets) {
    if (err || !tweets.length) { 
      console.log(err.mesage);
      return;
    }
    for (var i = 0; i < tweets.length; i++) {
      saveTweet(tweets[i]);
    };
  });
}


function saveTweet(tweet) {
  if (!tweet) return;
  var origin_tweet = tweet.retweeted_status;

  model.Tweet.create({
    tid: tweet.id,
    create_at: tweet.created_at,
    text: tweet.text,
    pic_url:tweet.original_pic, 
    user_id: tweet.uid,
    pic_local_path: tweet.original_pic,
    origin_tweetid:  origin_tweet?origin_tweet.id:0,
    comments_count: tweet.comments_count,
    reposts_count: tweet.reposts_count
  });

  if (origin_tweet) {
    saveTweet(origin_tweet);
  }
}
