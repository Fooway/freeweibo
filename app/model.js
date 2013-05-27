// create user and tweet model
var mongoose = require('mongoose');
mongoose.set('debug', false);


module.exports = function(url) {
  var model = {};

  var db = mongoose.connect(url || 'mongodb://localhost/test');
  console.log('mongodb connected...');
  mongoose.connection.on('error', function() {
    console.log('connection err...');
  });

  // setup model
  model.User = mongoose.model('User',{
    name: {type: String, index: true},
    uid: {type: Number, index: true};
    img_url: String,
    latest_tid: Number, // latested tweet id
    location: String,
    description: String,
    gender: String,
    followers_cnt: Number,
    friends_cnt: Number,
    tweets_cnt: Number
  });

  model.Tweet = mongoose.model('Tweet', {
    tid: {type: Number, index: true},
    status: {type: Number, default: 0}, /* 0 - normal; 1 - filtered by weibo; 2 - other */
    create_at: Number,
    text: String,
    user_id: Number,
    user_img: String,
    user_name: String,
    origin_pic_url: String,
    pic_name: String,
    comments_count: Number,
    reposts_count: Number,
  });

  return model;

}
