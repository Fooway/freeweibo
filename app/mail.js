var nodemailer = require('nodemailer');
var jade = require('jade');
var fs = require('fs');
var path = require('path');
var debug = require('debug')('mail');

var transport = nodemailer.createTransport("SMTP", {
    service: "Gmail",
    auth: {
        user: "freeweibo.me@gmail.com",
        pass: "Everdance1983"
    }
});

module.exports = function(model) {
  var model = model;
  var fileStr = fs.readFileSync(path.normalize(__dirname + '/../views/templates/mail-tweet.jade'), {encoding: 'utf-8'});
  var fn = jade.compile(fileStr);
  
  sendMails();


  function sendMails() {

    debug('[ '+ (new Date()).toLocaleTimeString() + ' ] start send digest to emails...');
    setTimeout(sendMails, 24*60*60*1000);
    model.Tweet.find({status: 0, sended: false })
      .limit(10)
      .sort('-create_at')
      .exec(function(err, tweets) {
        if (err || tweets.length == 0) {
          debug(err?err:'no tweets to send');
          return;
        }

        model.Mail.find(function (err, mails) {
          if (err || mails.length == 0) {
            debug(err?err:'no subscribers to send');
            return;
          }

          var content = '<div><h2 style="text-align:center;">最近被删除屏蔽的微博摘要</h2><ul>';
          for (var i = 0; i <tweets.length; i++) {
            date = (new Date(tweets[i].create_at)).toLocaleString();
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
            html += encodeURI(address);
            html += '">此处</a></p></div>';
            transport.sendMail({
              from: 'freeweibo.me@gmail.com',
              to: address,
              subject: 'FreeWeibo最新更新 ' + (new Date()).toDateString(),
              text: '',
              html: html
            }, function(err, response){
              debug(err?err: 'message sended for ' + address);
            });
          }

        });
      });
  }
}
