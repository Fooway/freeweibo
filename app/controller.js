var model = require('./model')();
var User = model.User;
var Tweet = model.Tweet;

module.exports = {
  
  // http://localhost/
  index: function(req, res) {
    Tweet.find(function(err, tweets) {
      if (err) {
        res.render('index', { err: err});
      } else {
        res.render('index', {tweets: tweets});
      }
    });
    

  },

}
