var nodemailer = require('nodemailer');
var jade = require('jade');
var fs = require('fs');
var spawn = require('child_process').spawn;
var path = require('path');
var crypto = require('crypto');
var cronJob = require('cron').CronJob;

module.exports = function(model, config) {
  var model = model;
  var log = config.log;
  var salt = config.salt?config.salt:'gdjk&*#djksa^&#*HGJKh*(#)HJGDJOKHS327!@DFJkpj-fiw2jq';
  var fileStr = fs.readFileSync(path.normalize(__dirname + '/../views/templates/mail-tweet.jade'), {encoding: 'utf-8'});
  var fn = jade.compile(fileStr);

  new cronJob({
    cronTime: '30 11 * * * *',
    onTick: function() {
      // Runs every day at 11:30:00 AM. 
      sendSubscribeMails();
      sendErrorLog();
    },
    start: true
  });

  new cronJob({
    cronTime: '30 01 15 * * *',
    onTick: function() {
      // Runs every month day 15 at 01:30:00 AM. 
      deleteUsers();
    },
    start: true
  });

  var mail = function(option, cb) {
    var transport = nodemailer.createTransport("SMTP", {
      service: "Gmail",
        auth: {
          user: "freeweibo.me@gmail.com",
        pass: "Everdance1983"
        }
    });

    transport.sendMail({
      from: 'freeweibo.me@gmail.com',
      to: option.address,
      subject: option.sub,
      text: option.text || '',
      html: option.html || ''
    }, function(err, response){
      if (err) {
        log.error(err);
      } else {
        log.info('message sended for ' + option.address);
      }
      cb?cb():null;
      transport.close();
    });
  };

  return mail;

  function sendSubscribeMails() {

    log.info('start send digest to emails...');
    model.Tweet.find({status: 1, sended: false })
      .limit(10)
      .sort('-delete_time')
      .exec(function(err, tweets) {
        if (err || tweets.length == 0) {
          log.error(err?err:'no tweets to send');
          return;
        }

        if (tweets.length <= 5) {
          log.error(err?err:'tweets too less to send');
          return;
        }

        model.Mail.find(function (err, mails) {
          if (err || mails.length == 0) {
            log.error(err?err:'no subscribers to send');
            return;
          }

          var content = '<div><h2 style="text-align:center;">最近被删除屏蔽的微博摘要</h2><ul>';
          for (var i = 0; i <tweets.length; i++) {
            date =(new Date(tweets[i].create_at)).toLocaleTimeString("en-US") + '  ' +
          (new Date(tweets[i].create_at)).toLocaleDateString("en-US");
        content += fn({tweet:tweets[i], date: date});
          };
          content += '</ul>';
          content += '<p><a href="http://freeweibo.me">查看更多</a></p>';
          content += '<p>取消订阅请点击:<a href="http://freeweibo.me/cancel?mail=';
          for (var i = 0; i < mails.length; i++) {
            sendOne(mails[i].address);
          };

          // update send mark
          model.Tweet.update({status:1, sended: false}, {sended: true}, { multi: true }, function(){});
          function sendOne(address) {
            var html = content;
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
          }

        });
      });
  }

  function sendErrorLog() {
    var date = new Date();
    var errors = '';
    var logfile = path.normalize(__dirname + '/../logs/') + 'run.log';
    var child_grep = spawn('grep ERROR ' + logfile);
    child_grep.on('data', function(data) {
      errors += data;
    });
    child_grep.on('close', function() {
      mail({address: 'tristones.liu@gmail.com', 
            subject: 'freeWeibo ErrorLog >> ' + date.toLocaleString('en-US'),
            text: errors
      });
    });
  }

  function deleteUsers() {
    var dateValue = (new Date()).valueOf();
    var interval = 20 * 24 * 60 * 60 * 1000;
    model.users.find({delete_attributed:0})
     .where('created_date').lt(dateValue - interval)
     .select('name uid')
     .exec(function(err, users) {
       if (err) {
         return;
       }
       for (var i = 0; i < users.length; i++) {
         log.info('removing user [' + user[i].name + ']');
         model.users.remove({uid: user[i].uid});
       };
     });
  }
}
