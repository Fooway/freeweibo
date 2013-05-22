/*
 * this deamon process runs in background to fetch user's tweets
 * */

var fs = require('fs');
var api = require('./api');
var async = require('async');
var model = require('../app/model')();

process.on('SIGTERM', function() {
  process.exit();
});

process.on('exit', function() {
  console.log('worker quiting...');
});

function fetchWorker() {
  fetcher();
  setTimeout(fetchWorker, 60*1000);
}


fetchWorker();
check();

function check() {
  model.Tweet.find({status: 0})
    .select('tid')
    .exec(function(err, tweets) {
    // body...
      console.log('number:' + tweets.length);
      function done(results) {
        console.log('done...');
        setTimeout(check, 60*1000);
      }

      function update_status (err, response, tweet) {
        // body...
        console.log('begin update...');
        if (response.error) {
          // (response.error_code == 20132) ||
          // (response.error_code == 20135)) {
          model.Tweet.update({tid: tweet.tid},
              {status: 1}, function() {});
          console.log(tweet.tid + ' unavailabe');
        } else {
          console.log(tweet.tid + ' status ok');
        }
      }

      async.eachSeries(tweets, function(tweet, cb) {
        setTimeout(function() {
          api.getTweetById(tweet.tid, function(err, data) {update_status(err, data, tweet); cb();});
        }, 1000);
      }, done);
  });
}

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
      saveTweet(tweets[i], false);
    };
  });
}


function saveTweet(tweet, retweet) {
  var origin_tweet = tweet.retweeted_status;
  var uid = 0;
  var name = '';

  if (!tweet) return;

  if (tweet.hasOwnProperty('user')) {
    var uid = tweet.user.id;
    var name = tweet.user.screen_name;
  }
  // create must have a callback function
  model.Tweet.create({
    tid: tweet.id,
    status: 0,
    retweet: retweet,
    create_at: (new Date(tweet.created_at)).valueOf(),
    text: tweet.text,
    origin_pic_url: tweet.original_pic || '', 
    user_id: uid,
    user_name: name,
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
    saveTweet(origin_tweet, true);
  }
}

