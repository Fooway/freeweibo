/*
 *  check and delete task for crawler
 * */

// check all the tweets' status in db.
function check() {
  var now = (new Date()).valueOf();

  log.info('start check... ');

  model.Tweet.find({status: 0}).where('create_at')
  .gt(now - CHECK_SELECT_TWEETS_DATE * 24 * 60 * 60 * 1000).
    sort('-create_at').
    select('tid attributed_uid user_id').
    exec(function(error, tweets) {
      function done(results) {
        setTimeout(check, CHECK_INTERVAL_BY_MINUTE * 60 * 1000);
      }

      function update_status (error, response, tweet) {
        if (!response) return;

        if ((response.error) &&(
           (response.error_code == 20112) || //由于作者隐私设置，你没有权限查看此微博
           (response.error_code == 20132) || //抱歉，该内容暂时无法查看。如需帮助，请联系客服
           (response.error_code == 20135))) { //源微博已被删除
          // update tweet status
          model.Tweet.update({tid: tweet.tid},
              {status: 1, delete_time: (new Date()).valueOf()}, function() {});
          // increment users delete_attribute
          model.User.update({uid: tweet.attributed_uid},
            {$inc:{delete_attributed:1}}, {upsert: false},function(){});
          log.info('tweet ' + tweet.tid + ' unavailabe');
          fetchUser({uid: tweet.user_id}, function(){});
         }

        if (response.id) {
          model.Tweet.update(
            { 
              tid: tweet.tid
            }, 
            {
              reposts_count: response.reposts_count,
              comments_count: response.comments_count
            }, 
          function(){
          });
        }
      }

      async.eachSeries(tweets, function(tweet, cb) {
        // need to delay 1s for each tweet
        // so we will not exceed the api access frequency
        // otherwise, weibo will block our access temporarily
        setTimeout(function() {
          log.info('checking tweet [' + tweet.tid + ']... ');
          api.getTweetById(tweet.tid, function(error, data) {
            if (!error) {
              update_status(error, data, tweet); 
            } else {
              log.error(error);
            }
            cb();
          });
        }, API_REQUEST_INTERVAL_BY_SEC * 1000);
      }, done);
  });
}

function deleteOld() {
  log.info('start deleting old tweets...');
  var now = (new Date()).valueOf();

  // first, remove all old tweets with no image
  model.Tweet.find({status: 0}).
   where('create_at').lt(now - DELETE_INTERVAL_BY_DATE * 24 * 60 * 60 * 1000).
   where('pic_name').equals('').
   remove(function() {});

  // then, remove all old tweets with image
  model.Tweet.find({status: 0}).
   where('pic_name').ne('').
   where('create_at').lt(now - DELETE_INTERVAL_BY_DATE * 24 * 60 * 60 * 1000).
   select('tid pic_name').
   exec(function(error, tweets) {
    if (error) {
      log.error(error);
      setTimeout(deleteOld, 4*60*60*1000);
    } else {
      async.each(tweets, function(tweet, cb) {
        model.Tweet.remove({tid: tweet.tid}, function(){});
        var files = api.imagePath(tweet.pic_name);

        log.info('deleting tweet: ' + tweet.tid);

        for (var i = 0; i < files.length; i++) {
          log.info('deleting ' + files[i]);
          fs.unlink(files[i]);
        };
        cb();
      }, function() { setTimeout(deleteOld, 8*60*60*1000);});
    }
    
  });
    
}

