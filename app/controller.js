var fs = require('fs');
var path = require('path');
var model = require('./model')();
var debug = require('debug')('controller');
var User = model.User;
var Tweet = model.Tweet;

module.exports = {

  db: model,

  // GET: [/]
  index: function(req, res) {
    res.render('index', { 
      title: "freeWeibo"
    });
  },

  // POST: [/]
  initData: function(req, res) {
    // get tweets
    if (req.param('tweet')) {
      Tweet.find({status: 1})
        .limit(70)
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

  // POST: subscribe email to tweets [/subscribe]:
  subscribe: function(req, res) {
    var email = req.param('email');
    model.Mail.update({address: email}, {address: email}, { upsert: true }, function(err,mail) {
      res.json({error: !!err});
    });
  },

  unsubscribe: function (req, res) {
    model.Mail.remove({address: email}, function(err, res) {
      res.render('unsubscribe', {mail: res});
    });
  }
};
