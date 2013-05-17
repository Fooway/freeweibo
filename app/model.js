// create user and tweet model
var moogoose = require('moogoose');

module.exports = function(url) {
  var model = {};

  var db = moogoose.connect(url || 'mongodb://localhost/test');
  // setup schema
  var userSchema = db.Schema({
    name: String,
      uid: Number
  });
  var tweetSchema = db.Schema({
    tid: Number,
      status: Number, /* 0 - normal; 1 - filtered by weibo; 2 - other */
      create_at: Date,
      text: String,
      user_id: Number,
      pic_url: String,
      pic_local_path: String,
      origin_tweetid: Number,
      comments_count: Number,
      reposts_count: Number
  });

  // setup model
  var model.User = db.model('User', userSchema);
  var model.Tweet = db.model('Tweet', tweetSchema);

  return model;

}
