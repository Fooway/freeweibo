var fs = require('fs');
var path = require('path');
var getUser= require('../fetcher/api').getUser;
var model = require('./model')();
var User = model.User;
var Tweet = model.Tweet;

var tweet_tmpl = fs.readFileSync(path.normalize(__dirname + '/../views/templates/tweet.jade'), {encoding: 'utf-8'});
var user_tmpl = fs.readFileSync(path.normalize(__dirname + '/../views/templates/user.jade'), {encoding: 'utf-8'});


module.exports = {
  
  // GET: [/]
  index: function(req, res) {
    if (req.xhr) {
      if (req.query.tweet) {
        Tweet.find(function(err, tweets) {
          if (err) {
            console.log(err.message);
            res.send({ err: err});
          } else {
            res.json(tweets);
          }
        });
      }
      // get users
      if (req.query.user) {
        User.find(function(err, users) {
          if (err) {
            console.log(err.message);
            res.send({ err: err});
          } else {
            console.log(users);
            res.json(users);
          }
        });
      }
    }
    else {
      res.render('index', { 
        title: "recent tweets",
        tweet_tmpl: tweet_tmpl,
        user_tmpl: user_tmpl
      });
    }
  },

  // POST :get tweets or users on page loading
  initData: function(req, res) {
    // get tweets
    if (req.tweet) {
      Tweet.find(function(err, tweets) {
        if (err) {
          console.log(err.message);
          res.send({ err: err});
        } else {
          res.send({tweets: tweets});
        }
      });
    }
    // get users
    if (req.user) {
      User.find(function(err, users) {
        if (err) {
          console.log(err.message);
          res.send({ err: err});
        } else {
          res.send({users: users});
        }
      });
    }
  },

  // POST :find tweets of a specific user [/user/:id]
  user: function(req, res) {
    Tweet.find({user_id: req.param('id')}, function(err, tweets) {
      if (err) {
        res.send({err: err});
      } else {
        res.send({tweets: tweets});
      };
    });
  },

  // POST: add a user to watch [/add]
  add: function(req, res) {
    var screen_name = req.param('name');
    User.find({name: screen_name}, function (err, user) {
      console.log('finish find!');
      if (err) {
        res.send({err: err});
        return;
      }
      if (!user.length) { 
        getUser(screen_name, function(err, user) {
          if (err) {
            console.log(err);
            res.send({err: err});
          } else {
            var newuser = new User({name: screen_name, uid: user.id});
            newuser.save(function () {
              res.send({user: newuser});
            });
          }
        });
      } else {
        res.send({});
      }
    });
  },

  // POST: subscribe email to tweets [/subscribe] TODO:
  subscribe: function(req, res) {
  }

}
