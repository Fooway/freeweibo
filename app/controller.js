var fs = require('fs');
var path = require('path');
var model = require('./model')();
var config = require('./config');
var crypto = require('crypto');
var jade = require('jade');
var User = model.User;
var Tweet = model.Tweet;

var template = jade.compile(fs.readFileSync(path.normalize(__dirname + '/../views/templates/tweet.jade'),
      {encoding: 'utf-8'}));

var salt = config.option.salt;
var page_num = config.option.page_num || 30;
var md5 = crypto.createHash('md5');

function getTweets(page, cb) {
  Tweet.find({status: 1})
    .limit(page_num)
    .skip(page_num*page)
    .sort('-delete_time')
    .exec(function(err, tweets) {
      if (err) {
        console.error(err.message);
        cb(err);
      } else {
        cb(null, tweets);
      }
    });
}

function  convert(tweets) {
  for (var i = 0; i < tweets.length; i++) {
    tweets[i].date =(new Date(tweets[i].create_at)).toLocaleTimeString("en-US") + '  ' +
                    (new Date(tweets[i].create_at)).toLocaleDateString("en-US");
    tweets[i].text = tweets[i].text.replace(/(?:[^"])(http:\/\/[\/.=?\w]*)/g, '<a href="$1" target="_blank">$1</a>');
  };
}
module.exports = {

  db: model,

  // GET: [/]
  index: function(req, res) {
    getTweets(0, function(err, tweets) {
      if (err) {
        res.redirect('404');
      } else {
        User.find(function(err, users) {
          if (err) {
            console.error(err.message);
            res.redirect('404');
          } else {
            convert(tweets);
            res.render('index', { 
              title: "FreeWeibo",
              tweets: tweets,
              users: users
            });
          }
        });
      }
    });
  },

  // POST: [/]
  getPage: function(req, res) {
    var page = req.param('page');
    getTweets(page, function(err, tweets) {
      if (err) {
        res.send({err:'服务器出错，查询超时!'});
      } else {
        convert(tweets);
        var result = '';
        for (var i = 0; i < tweets.length; i++) {
          result += template({tweet:tweets[i]});
        };
        res.send({tweets:result});
      }
    });
  },

  // POST: subscribe email to tweets [/subscribe]:
  subscribe: function(req, res) {
    var email = req.param('email');
    model.Mail.update({address: email}, {address: email}, { upsert: true }, function(err,mail) {
      res.json({error: !!err});
    });
  },

  unsubscribe: function (req, res) {
    var email = req.param('mail');
    var hash = req.param('hash');
    md5.update(salt + email);
    if (md5.digest('base64') != hash) {
      res.render('unsuscribe', {err: '非法的取消订阅请求'});
      return;
    }
    model.Mail.remove({address: email}, function(err) {
      if (err) {
        res.render('unsuscribe', {err: '不存在的订阅邮箱'});
      } else {
        res.render('unsubscribe', {mail: email});
      }
    });
  }
};
