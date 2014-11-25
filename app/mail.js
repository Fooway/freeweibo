var nodemailer = require('nodemailer');
var jade = require('jade');
var fs = require('fs');
var spawn = require('child_process').spawn;
var path = require('path');
var crypto = require('crypto');
var cronJob = require('cron').CronJob;
var log = require('./log');
var log = require('./config');
var model = require('./model');

var salt = config.option.salt;
var fileStr = fs.readFileSync(path.normalize(__dirname + '/../views/templates/mail-tweet.jade'),
                              {encoding: 'utf-8'});
var tmpl = jade.compile(fileStr);

function mailBody(tweets) {
  var date;
  var content = '<div><h2 style="text-align:center;">最近被删除屏蔽的微博摘要</h2><ul>';

  for (var i = 0; i < tweets.length; i++) {
    date =(new Date(tweets[i].create_at)).toLocaleTimeString("en-US") + ' ' +
      (new Date(tweets[i].create_at)).toLocaleDateString("en-US");
    content += tmpl({tweet:tweets[i], date: date});
  };
  content += '</ul>';
  content += '<p><a href="http://freeweibo.me">查看更多</a></p>';
  content += '<p>取消订阅请点击:<a href="http://freeweibo.me/cancel?mail=';
  return content;
}

function mail(option, cb) {
  var transport = nodemailer.createTransport("SMTP", {
    service: "Gmail",
    auth: {
      user: "freeweibo.me@gmail.com",
      pass: "*2%^jdskE#092"
    }
  });

  transport.sendMail({
    from: 'freeweibo.me@gmail.com',
    to: option.address,
    subject: option.sub,
    text: option.text || '',
    html: option.html || ''
  }, function(error, response){
    if (error) {
      log.error(error);
    } else {
      log.info('message sended for ' + option.address);
    }
    cb?cb():null;
    transport.close();
  });
};

module.exports = {
  cron: function () {
    new cronJob({
      cronTime: '00 30 11 * * *',
      onTick: function() {
        // Runs every day at 11:30:00 AM. 
        sendMails();
      },
      start: true
    });

    new cronJob({
      cronTime: '00 00 03 * * 2,6',
      onTick: function() {
        // Runs every month day 15 at 01:30:00 AM. 
        deleteUsers();
      },
      start: true
    }); 
  },

  send: mail
}

function sendMails() {
  var tweets;
  async.series([
    // fetch censored tweets
    function (cb) {
      model.Tweet.find({status: 1, sended: false })
      .limit(20)
      .sort('-delete_time')
      .exec(function(error) {
        if (error || tweets.length == 0) {
          log.error(error?error:'no tweets to send');
          cb(error);
        } else {
          tweets = data;
          cb();
        }
      });
    },
    // fetch subscribers
    function (cb) {
      model.Mail.find(function (error, subs) {
        if (error || subs.length == 0) {
          log.error(error?error:'no subscribers to send');
          return cb(error);
        }
        cb();
      });
    },
    // send mails
    function (cb) {
      var content = mailBody(tweets);

      async.eachSeries(subs, function (sub, callback) {
        var html = content;
        var address = sub.address;
        var md5 = crypto.createHash('md5');

        md5.update(salt + address);
        html += encodeURI(address);
        html += '&hash=' + md5.digest('base64');
        html += '">此处</a></p></div>';
        mail({
          address: address,
          sub: 'FreeWeibo最新更新 ' + (new Date()).toDateString(),
          text: '',
          html: html
        });
        setTimeout(callback, 5000);
      }, cb)
    }
  ], function (err) {
    // update send mark
    model.Tweet.update({
      status:1, sended: false
    }, {
      sended: true
    }, { 
      multi: true 
    }, function(err) {
      log.error(err);
    });
  });
}
