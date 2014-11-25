/*
 *  recycle old uncensored tweets and users who haven't contribute
 *  much to censored tweets
 * */

var async = require('async');
var api = require('./api');
var config = require('./config');
var fetch = require('./fetch');
var model = require('../app/model')();
var log = require('../app/log');

// check all the tweets' status in db.

function deleteTweets() {
  var now = (new Date()).valueOf();

  log.info('start deleting old tweets...');

  async.series([
    // first, remove all old tweets with no image
    function (cb) {
      model.Tweet.find({status: 0}).
        where('create_at').lt(now - config.TM.DELETE_INTERVAL).
        where('pic_name').equals('').
        remove(cb);
    },
    // then, remove all old tweets with image
    function (cb) {
      model.Tweet.find({status: 0}).
        where('pic_name').ne('').
        where('create_at').lt(now - config.TM.DELETE_TWEET).
        select('tid pic_name').
        exec(function(error, tweets) {
        if (error) {
          return cb(error);
        }
        async.each(tweets, function(tweet, callback) {
          model.Tweet.remove({tid: tweet.tid}, function(){});
          var files = api.imagePath(tweet.pic_name);

          for (var i = 0; i < files.length; i++) {
            fs.unlink(files[i]);
          };
          callback();
        }, cb);
      });

    }
  ], function (err) {
    log.error(err);
    setTimeout(deleteTweets, config.TM.DELETE_TASK);
  });
    
}

function deleteUsers() {
  var dateValue = (new Date()).valueOf();
  var users;

  async.series([
    function (cb) {
      model.User.find({delete_attributed:0})
      .where('created_date').lt(dateValue - config.TM.DELETE_USER)
      .select('name uid')
      .exec(function(error, docs) {
        if (error) {
          return cb(error);
        }
        users = docs;
        cb();
      });
    },
    function (cb) {
      async.eachSeries(users, function (user, callback) {
        log.info('removing user [' + user.name + ']');
        user.remove(function() {});
        api.removeFriend(user.name, callback);
      }, cb);
    }
  ], function () {
    setTimeout(deleteUsers, TM.DELETE_TASK);
  });
}

module.exports = function () {
  deleteTweets();
  deleteUsers();
};

