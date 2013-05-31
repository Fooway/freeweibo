var nodemailer = require('nodemailer');
var jade = require('jade');
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var debug = require('debug')('mail');

var transport = nodemailer.createTransport("SMTP", {
    service: "Gmail",
    auth: {
        user: "freeweibo.me@gmail.com",
        pass: "Everdance1983"
    }
});

module.exports = function(model, config) {
  var model = model;
  var salt = config.salt?config.salt:'gdjk&*#djksa^&#*HGJKh*(#)HJGDJOKHS327!@DFJkpj-fiw2jq';
  var md5 = crypto.createHash('md5');
  var fileStr = fs.readFileSync(path.normalize(__dirname + '/../views/templates/mail-tweet.jade'), {encoding: 'utf-8'});
  var fn = jade.compile(fileStr);

  sendSubscribeMails();
  setTimeout(sendErrorLog, 4*60*60*1000);

  return function mail(option, cb) {
    transport.sendMail({
      from: 'freeweibo.me@gmail.com',
      to: option.address,
      subject: option.sub,
      text: option.text || '',
      html: option.html || ''
    }, function(err, response){
      if (err) {
        console.error('[' + (new Date()).toLocaleString('en-US') + '] ' + err);
      } else {
        debug('message sended for ' + address);
      }
      cb?cb():null;
    });
  };

  function sendSubscribeMails() {//{{{

    debug('[ '+ (new Date()).toLocaleTimeString() + ' ] start send digest to emails...');
    setTimeout(sendSubscribeMails, 24*60*60*1000);
    model.Tweet.find({status: 1, sended: false })
      .limit(10)
      .sort('-delete_time')
      .exec(function(err, tweets) {
        if (err || tweets.length == 0) {
          debug(err?err:'no tweets to send');
          return;
        }

        if (tweets.length <= 5) {
          debug(err?err:'tweets too less to send');
          return;
        }

        model.Mail.find(function (err, mails) {
          if (err || mails.length == 0) {
            debug(err?err:'no subscribers to send');
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
          model.Tweet.update({status:1, sended: false}, {sended: true});
          function sendOne(address) {
            var html = content;
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
  }//}}}//}}}
  function sendErrorLog() {
    setTimeout(sendErrorLog, 24*60*60*1000);
    var date = new Date();
    var path = path.normalize(__dirname + '/../logs/');
    fs.readFile(path + 'error.log'), {encoding: 'utf-8'}, function(err, data) {
      if (err) {
        console.error('[' + (new Date()).toLocaleString('en-US') + '] ' + err);
        return;
      }
      mail({address: 'tristones.liu@gmail.com', 
            subject: 'ErrorLog >> ' + date.toLocaleString('en-US'),
            text: data
      }, function() {
        // backup log
        fs.rename(path + 'error.log', 
          path + 'error-' + date.getFullYear() + '-' +
          date.getMonth + '-' + date.getDate() + 
          date.getHours + '-' + date.getMinutes() + '.log');
      });
    });
  }
}
