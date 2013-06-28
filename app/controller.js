var fs = require('fs');
var path = require('path');
var model = require('./model')();
var config = require('./config');
var crypto = require('crypto');
var jade = require('jade');
var User = model.User;
var Tweet = model.Tweet;
var service = {};


var template = jade.compile(fs.readFileSync(path.normalize(__dirname + '/../views/templates/tweet.jade'),
      {encoding: 'utf-8'}));
var userTemplate = jade.compile(fs.readFileSync(path.normalize(__dirname + '/../views/templates/user.jade'),
      {encoding: 'utf-8'}));

var salt = config.option.salt;
var confLimit = config.option.limit;

function getTweets(option, cb) {
  var offset = option.offset || 0;
  var limit = option.limit || confLimit;
  Tweet.find({status: 1})
    .limit(limit)
    .skip(offset)
    .sort('-delete_time')
    .exec(function(error, tweets) {
      if (error) {
        console.error(error.message);
        cb(error);
      } else {
        cb(null, tweets);
      }
    });
}

function  convert(tweets) {
  for (var i = 0; i < tweets.length; i++) {
    var date = new Date(tweets[i].create_at);
    tweets[i].date = date.toLocaleTimeString("en-US") + ' ' + date.getDate() +
                     '/' + (date.getMonth()+1) + '/' + date.getFullYear();
    if (tweets[i].text) {
      tweets[i].text = tweets[i].text.replace(/(?:[^"])(http:\/\/[\/.=?\w]*)/g, '<a href="$1" target="_blank">$1</a>');
    }
  };
}
module.exports = {

  db: model,
  initService: function (param) { service = param;},

  // GET: [/]
  index: function(req, res) {
    getTweets({}, function(error, tweets) {
      if (error) {
        res.redirect('404');
      } else {
        User.find(function(error, users) {
          if (error) {
            console.error(error.message);
            res.redirect('404');
          } else {
            convert(tweets);
            res.render('index', { 
              title: "FreeWeibo",
              tweets: tweets,
              users: users,
              initOffset: tweets.length,
              initLimit: confLimit
            });
          }
        });
      }
    });
  },

  // get: [/tweets]
  getPage: function(req, res) {
    var offset = req.param('offset');
    var limit = req.param('limit');
    getTweets({offset: offset, limit: limit}, function(error, tweets) {
      if (error) {
        res.send({error:'服务器出错，查询超时!'});
      } else {
        convert(tweets);
        var result = '';
        for (var i = 0; i < tweets.length; i++) {
          result += template({tweet:tweets[i]});
        };
        res.send({tweets:result, count: tweets.length});
      }
    });
  },

  // POST: subscribe email to tweets [/subscribe]:
  email: function(req, res) {
    var email = req.param('data');
    model.Mail.update({address: email}, {address: email}, { upsert: true }, function(error,mail) {
      res.json({error: !!error});
    });
  },

  // GET: [/cancel?:email:hash]
  unsubscribe: function (req, res) {
    var email = req.param('mail');
    var hash = req.param('hash');
    var md5 = crypto.createHash('md5');
    md5.update(salt + email);
    if (md5.digest('base64') != hash) {
      res.render('unsuscribe', {error: '非法的取消订阅请求'});
      return;
    }
    model.Mail.remove({address: email}, function(error) {
      if (error) {
        res.render('unsuscribe', {error: '不存在的订阅邮箱'});
      } else {
        res.render('unsubscribe', {mail: email, error: null});
      }
    });
  },

  // GET: [/about]
  about: function(req, res) { res.render('about', {title: 'About | freeWeibo'});},

  login: function (req, res) {
    res.render('login', {title: "Admin-Login | FreeWeibo"});
  },

  author: function(req, res) {
    var username = req.param('username');
    var password = req.param('password');

    if (username === config.option.username && password === config.option.password) {
      res.cookie('authorized', '1', { maxAge: 14*24*60*60*1000, signed: true });
      res.json({status: true});
    } else {
      res.json({status: false});
    }
  },

  admin: function(req, res) {

    if (req.signedCookies.authorized) {
      User.find(function(error, users) {
        if (error) {
          console.error(error.message);
          res.redirect('404');
        } else {
          res.render('admin', { 
            title: "Admin | FreeWeibo",
            users: users
          });
        }
      });
    } else {
      res.redirect('/login');
    }
  },

  // POST: [/add-user, /delete-user]
  adminUsers: function(req, res) {
    if (req.path === '/add-user') {
      var userName = req.param('data');
      console.log(userName);
      service.addUser({name: userName}, function(error, user) {
        if (error) {
          res.json({error: error});
        } else {
          res.json({data: userTemplate({user:user})});
        }
      });

    } else {
      var userId = req.param('data');
      console.log('remove user ' + userId);
      User.remove({uid: userId}, function() {});
      res.json({});
    }
  }
};
