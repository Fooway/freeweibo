var getUser= require('../fetcher/api').getUser;
var model = require('./model')();
var User = model.User;
var Tweet = model.Tweet;

module.exports = {
  
  // GET: find all tweets and users [/]
  index: function(req, res) {
    // xhr get
    if (req.xhr) { 
      // get tweets
      if (req.tweet) {
        Tweet.find(function(err, tweets) {
          if (err) {
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
            res.send({ err: err});
          } else {
            res.send({users: users});
          }
        });
      }
      
    // get html
    } else {
      res.render('index', { title: "recent tweets"});
    }

  },

  // POST :find tweets of a specific user [/user/:id]
  user: function(req, res) {
    Tweet.find({user_id: req.uid}, function(err, tweets) {
      if (err) {
        console.log('user: ' + req.name + 'not exist!');
        res.send({err: err});
      } else {
        res.send({tweets: tweets});
      };
    });
  },

  // POST: add a user to watch [/add]
  add: function(req, res) {
    User.find({name: req.name}, function (err, user) {
      if (!user) { 
        getUser(req.name, function(err, user) {
          if (err) {
            console.log(err);
            res.send({err: err});
          } else {
            var newuser = new User({name: req.name, uid: user.id});
            newuser.save(function () {
              res.send({user: newuser});
            });
          }
        });
      } else {
        res.send({user: user});
      }
    });
  },

  // POST: subscribe email to tweets [/subscribe] TODO:
  subscribe: function(req, res) {
  }

}
