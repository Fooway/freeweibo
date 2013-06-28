// create user and tweet model
var mongoose = require('mongoose');
mongoose.set('debug', true);


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
    uid: {type: Number, index: true},
    img_url: String,
    latest_tid: Number, // latested tweet id
    location: String,
    description: String,
    gender: String,
    followers_cnt: Number,
    friends_cnt: Number,
    tweets_cnt: Number,
    delete_attributed: {type:Number, default:0}, // how many tweets or retweets of this user which are deleted 
    created_date:{type:Number, default:0} // time user created at this server
  });

  model.Tweet = mongoose.model('Tweet', {
    tid: {type: Number, index: true},
    status: {type: Number, default: 0}, /* 0 - normal; 1 - filtered by weibo; 2 - other */
    create_at: Number,
    delete_time: {type: Number, default: 0},
    sended: {type: Boolean, default: false},
    text: String,
    user_id: Number,
    user_img: String,
    user_name: String,
    origin_pic_url: String,
    pic_name: {type: String, default: ''},
    comments_count: Number,
    reposts_count: Number,
    attributed_uid: Number
  });

  model.Mail= mongoose.model('Mail', {
    address: {type: String, index: true},
  });

  return model;

}
