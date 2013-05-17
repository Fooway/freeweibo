var getUid= requie('../fetcher/api').getUid;
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
      res.render('index');
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
        getUid(req.name, function(err, id) {
          if (err) {
            console.log(err);
            res.send({err: err});
          } else {
            var user = new User({name: req.name, uid: id});
            user.save(function () {
              res.send({user: user});
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
