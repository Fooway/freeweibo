$(function () {
  var jade = require('jade');
  var tweetTmp = jade.compile($('#tweet-template').html());
  var userTmp = jade.compile($('#user-template').html());

  $.get('/', function(tweets) {
    for (var i = 0; i <tweets.length; i++) {
      insertTweet(tweets[i]);
    };
  }, 'json');

  $.get('/', function(users) {
    for (var i = 0; i < users.length; i++) {
      insertUser(user[i]);
    };
  }, 'json');

  function insertTweet(tweet) {
    $('.tweets').append(tweetTmp({tweet: tweet}));
  }

  function insertUser(user) {
    $('.users').append(userTmp({user: user}));
  }
})
