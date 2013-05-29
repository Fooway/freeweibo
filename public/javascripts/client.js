$(function () {

  var jade = require('jade');
  var tweetTmp = jade.compile($('#tweet-template').html());
  var userTmp = jade.compile($('#user-template').html());

  $(document).ajaxStart(function() {
    $('.tweets').css('cursor', 'wait');
    $('.users').css('cursor', 'wait');
  });

  $('#subscribe').on('click', function () {
    // body...
    var pattern = /^[\w].[-.\w]*@[-\w]+\.[-\w]+/;
    var address = $('#mail').val().replace(/^\s+|\s+$/g,'');
    if (pattern.test(address)) {
      $.post('/subscribe', { email: address}, function(res) {
        if (res.err) {
          $("#alert").text('订阅失败！').css('color', 'red').show();
        } else {
          $("#alert").text('订阅成功！').css('color', 'green').show();
        }
        $('#mail').val('');
        setTimeout(function() {
          $('#alert').fadeOut(2000);
        }, 1000);
        
      });
    }
    else {
      $("#alert").text('无效的地址!').css('color', 'red').show();
      $('#mail').val('');
      setTimeout(function() {
        $('#alert').fadeOut(2000);
      }, 1000);
    }
  });
  $.post('/', {tweet: 1}, function(tweets) {
    for (var i = 0; i <tweets.length; i++) {
      insertTweet(tweets[i]);
    };
    $('.tweets').css('cursor', 'default');
  }, 'json');

  $.post('/', {user: 1}, function(users) {
    for (var i = 0; i < users.length; i++) {
      insertUser(users[i]);
    };
    $('.users').css('cursor', 'default');
  }, 'json');

  $('.tweets').on('click', '.thumb_img', function() {
    $(this).hide();
    $(this).next().show();
  });

  $('.tweets').on('click', '.middle_img', function() {
    $(this).hide();
    $(this).prev().show();
  });

  function insertTweet(tweet) {
    tweet.create_at = (new Date(tweet.create_at)).toLocaleString();

    var $tweet = $(tweetTmp({tweet: tweet})).appendTo('.tweets');
    var $main_text = $tweet.find('.text > span');

    $main_text.html($main_text.html().replace(/(http:\/\/[\/.=?\w]*)/g, '<a href="$1" target="_blank">$1</a>'));
  }

  function insertUser(user) {
    $('.users').append(userTmp({user: user}));
  }
})
