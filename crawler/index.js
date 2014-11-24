/*
 * this deamon process runs in background to fetch user's tweets
 * */

var fs = require('fs');
var api = require('./api')();
var async = require('async');
var model = require('../app/model')();
var log = require('../app/log');
var seedTweeters = require('./seed-tweeters');
var config = require('./config');
var fetch = require('./fetch');
var check = require('./check');

module.exports = function () {
  var user;

  async.eachSeries([
    // check key user existance
    function (cb) {
      api.getUserInfo({
        screen_name: config.key_user
      }, function(error, resp) {
        if (error || (resp && resp.error)) {
          log.error(error || resp.error);
          cb(error || resp.error);
        } else {
          user = resp;
          cb();
        }
      });
    },

    // create key user in db
    function (cb) {
      model.User.findOne({type: 'key_user'}, function(err, doc) {
        if (err) return cb(err);

        if (!doc) {
          model.User.create({
            name: user.name,
            uid: user.uid,
            type: 'key_user',
            latest_tid: 0
          }, function(error, doc) {
            cb(error);
          });
        } else {
          cb();
        }
      });
    },
    // seed a few users as key user's friends
    // NOTE: under Weibo's new API, we can only fetch friends tweets
    // even with registered AppID
    function (cb) {
      if (user.friends_count < 10) {
        async.eachSeries(seedTweeters, function(seed, callback) {
          // need to delay 1s for each tweet
          // so we will not exceed the api access frequency
          // otherwise, weibo will block our access temporarily
          log.info('add friend [' + seed + ']... ');
          api.addFriend({name: seed}, function(error, data) {
            log.error(error);
            setTimeout(callback, config.TM.API_REQUEST_INTERVAL);
          });
        }, function(err) {
          cb();
        });
      }
    }
  ], function (err) {
    // start fetch and check task
    if (err) {
      log.err(err);
    } else {
      fetch.tweets();
      check();
    }
  });
};

