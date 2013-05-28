var nodemailer = require('nodemailer');
var debug = require('debug')('mail');

var transport = nodemailer.createTransport("SMTP", {
    service: "Gmail",
    auth: {
        user: "gmail.user@gmail.com",
        pass: "userpass"
    }
});

module.exports = function(model, config) {
  var model = model;
  var fileStr = fs.readFileSync(path.normalize(__dirname + '/../views/templates/tweet.html'), {encoding: 'utf-8'});
  var fn = jade.compile(fileStr);
  
  sendMails();


  function sendMails() {

    debug('[ '+ (new Date()).toLocaleTimeString() + ' ] start send digest to emails...');
    setTimeOut(sendMails, 24*60*60*1000);
    model.Tweet.find({status: 1, sended: 0}
      .limit(10)
      .sort('-create_at')
      .exec(function(err, tweets) {
      if (err || mails.length == 0) {
        debug(err?err:'no tweets to send');
        return;
      }

      model.Mail.find(function (err, mails) {
        if (err || mails.length == 0) {
          debug(err?err:'no subscribers to send');
          return;
        }

        var content = '<style>.media, .media-body{overflow:hidden;} .pull-left{float:left;}'; 
        content = '.middle_img {display: none;} p.tail{font-size:12px}'; 
        content = '</style><h4>最近被删除屏蔽的微博摘要：</h4><ul>';
        for (var i = 0; i <tweets.length; i++) {
          content += fn(tweets[i]);
        };
        content += '</ul>';
        content += '<p><a href="s.chaos-lab.com">查看更多</a></p>';
        content += '<p>取消订阅请点击:<a href="s.chaos-lab.com/cancel?mail=';

        for (var i = 0; i < mails.length; i++) {
          sendOne(mails[i].address);
        };

        function sendOne(address) {
          var html = content;
          html += encodeURI(address);
          html += '">此处</a></p>';
          transport.sendMail({
            from: 'noreply@filterback.com',
            to: address,
            subject: '微博屏蔽删除摘要',
            text: '',
            html: html
          }, function(err, response){
            debug(err?err: 'message sended for ' + address);
          });
        }

      });
    });

}
