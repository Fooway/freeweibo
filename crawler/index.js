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

function timeConfig(option) {
  var tmp;
  (tmp = option.delete_interval_days) ? (DELETE_INTERVAL_BY_DATE = tmp):null;
  (tmp = option.fetch_interval_mins) ? (FETCH_INTERVAL_BY_MINUTE = tmp):null;
  (tmp = option.check_interval_mins) ? (CHECK_INTERVAL_BY_MINUTE = tmp):null;
  (tmp = option.api_request_interval_secs) ? (API_REQUEST_INTERVAL_BY_SEC = tmp):null;
  (tmp = option.check_select_tweets_days) ? (CHECK_SELECT_TWEETS_DATE= tmp):null;
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

  addFriendFromDb();
  check();
  deleteOld();

  return {
    addUser: fetchUser
  };
};


function addFriendFromDb() {

  api.getUserInfo({screen_name: 'freeman2013_28472'}, function(error, user) {
    if (error || (user && user.error)) {
      var error = error || user.error;
      log.error(error);
    } else {
      if (user.friends_count < 10) {
        model.User.find({}, function (error, users) {
          async.eachSeries(users, function(user, cb) {
            // need to delay 1s for each tweet
            // so we will not exceed the api access frequency
            // otherwise, weibo will block our access temporarily
            setTimeout(function() {
              log.info('add user [' + user.name + ']... ');
              api.addFriend({uid: user.uid}, function(error, data) {
                if (error) {
                  log.error(error);
                }
                cb();
              });
            }, API_REQUEST_INTERVAL_BY_SEC * 1000);
          }, fetch);
        });
      } else {
        log.info('key user friends ok.');
        fetch();
      }
    }
  });
}

