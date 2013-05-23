$(function () {
  var jade = require('jade');
  var tweetTmp = jade.compile($('#tweet-template').html());
  var userTmp = jade.compile($('#user-template').html());

  $.get('/', {tweet: 1}, function(tweets) {
    for (var i = 0; i <tweets.length; i++) {
      insertTweet(tweets[i]);
    };
  }, 'json');

  $.get('/', {user: 1}, function(users) {
    for (var i = 0; i < users.length; i++) {
      console.log(users[i]);
      insertUser(users[i]);
    };
  }, 'json');

  $('#add_tweeter').on('click', function() {
    var name = $('#tweeter_name').val();
    console.log(name);
    if (name) {
      $.post('/add', {name: name}, function(data) {
        if (data && data.user) {
          insertUser(data.user);
        }
        if (data && data.err) {console.log(err); }
      });
    }
  });

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
    if (tweet.status) {
      $tweet.addClass('filtered');
    }
  }

  function insertUser(user) {
    $('.users').append(userTmp({user: user}));
  }
})
