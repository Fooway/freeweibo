// create user and tweet model
var mongoose = require('mongoose');
mongoose.set('debug', true);
module.exports = function(url) {
  var model = {};

  var db = mongoose.connect(url || 'mongodb://localhost/test');
  console.log('mongodb connected...');
  mongoose.connection.on('error', function() {
    console.log('connection err');
  });

  // setup model
  model.User = mongoose.model('User',{
    name: String,
    uid: Number,
    latest_tid: Number, // latested tweet id
  });
  model.Tweet = mongoose.model('Tweet', {
    tid: Number,
    status: Number, /* 0 - normal; 1 - filtered by weibo; 2 - other */
    create_at: String,
    text: String,
    user_id: Number,
    pic_url: String,
    pic_local_path: String,
    origin_tweetid: Number,
    comments_count: Number,
    reposts_count: Number
  });

  return model;

}
