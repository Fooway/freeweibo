var fs = require('fs');
var path = require('path');
var model = require('./model')();
var debug = require('debug')('controller');
var User = model.User;
var Tweet = model.Tweet;

var tweet_tmpl = fs.readFileSync(path.normalize(__dirname + '/../views/templates/tweet.jade'), {encoding: 'utf-8'});
var user_tmpl = fs.readFileSync(path.normalize(__dirname + '/../views/templates/user.jade'), {encoding: 'utf-8'});


module.exports = {

  db: model,

  // GET: [/]
  index: function(req, res) {
    res.render('index', { 
      title: "FilterBack",
    tweet_tmpl: tweet_tmpl,
    user_tmpl: user_tmpl
    });
  },

  // POST: [/]
  initData: function(req, res) {
    // get tweets
    if (req.param('tweet')) {
      Tweet.find({})
        .sort('-create_at')
        .exec(function(err, tweets) {
          if (err) {
            debug(err.message);
            res.send({ err: err});
          } else {
            res.json(tweets);
          }
        });
    }
    // get users
    if (req.param('user')) {
      User.find(function(err, users) {
        if (err) {
          debug(err.message);
          res.send({ err: err});
        } else {
          res.json(users);
        }
      });
    }
  },

  // POST: subscribe email to tweets [/subscribe] TODO:
  subscribe: function(req, res) {
  }
};
