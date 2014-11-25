/*
 *  check and delete task for crawler
 * */

var async = require('async');
var api = require('./api');
var config = require('./config');
var fetch = require('./fetch');
var model = require('../app/model');
var log = require('../app/log');

// check all the tweets' status in db.
module.exports = function check() {
  var now = (new Date()).valueOf();
  var tweets;

  log.info('start check... ');

  async.series([
    // fetch tweets from db
    function (cb) {
      model.Tweet.find({status: 0}).where('create_at')
      .gt(now - config.TM.CHECK_SELECT_TWEETS)
      .sort('-create_at')
      .select('tid attributed_uid user_id')
      .exec(function(error, docs) {
        if (error) return cb(error);
        tweets = docs;
        cb();
      })
    },
    // check tweet existance on weibo
    function (cb) {
      async.eachSeries(tweets, function(tweet, callback) {
        function delay() {
          setTimeout(callback, config.TM.API_REQUEST_INTERVAL);
        };
        // need to delay 1s for each tweet
        // so we will not exceed the api access frequency
        // otherwise, weibo will block our access temporarily
        log.info('checking tweet [' + tweet.tid + ']... ');

        api.getTweetById(tweet.tid, function(error, data) {
          if (error || !data) {
            return delay();
          }

          if ((data.error) &&(
             (data.error_code == 20112) || //由于作者隐私设置，你没有权限查看此微博
             (data.error_code == 20132) || //抱歉，该内容暂时无法查看。如需帮助，请联系客服
             (data.error_code == 20135))) { //源微博已被删除
            // update tweet status
            model.Tweet.update({tid: tweet.tid}, {
              status: 1, 
              delete_time: (new Date()).valueOf()
            }, function(err) {
              log.error(err);
            });
            // increment users delete_attribute
            model.User.update({uid: tweet.attributed_uid},
              {$inc:{delete_attributed:1}}, {upsert: false},function(err){
              log.error(err);
            });

            // add possible new user to db and as friend
            fetch.user({uid: tweet.user_id}, function (err) {
              log.error(err);
              delay();
            });
          } else {
            model.Tweet.update({ tid: tweet.tid }, {
              reposts_count: data.reposts_count,
              comments_count: data.comments_count
            }, delay);
          }
        });
      }, cb);
    }
  ], function (err) {
    log.error(err);
    setTimeout(check, config.TM.CHECK_INTERVAL);
  });
};


