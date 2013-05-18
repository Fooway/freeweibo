/*
 * this deamon process run in background to fetch user's tweets
 * */

var fs = require('fs');
var api = require('./api');
var model = require('../app/model')();

api.getUserTweets(function(err, tweets) {
  console.log('start...');
  if (err) { console.log(err.mesage); }
  for (var i = 0; i < tweets.length; i++) {
    saveTweet(tweets[i]);
  };
});

function saveTweet(tweet) {
  if (!tweet) return;
  var origin_tweet = tweet.retweeted_status || {};

  model.Tweet.create({
    tid: tweet.id,
    create_at: tweet.created_at,
    text: tweet.text,
    pic_url:tweet.original_pic, 
    user_id: tweet.uid,
    pic_local_path: tweet.original_pic,
    origin_tweetid: origin_tweet.id || 0,
    comments_count: tweet.comments_count,
    reposts_count: tweet.reposts_count
  }, function(err) {
    console.log('ok...');
    console.log(err);
  });

  //saveTweet(origin_tweet);
}
