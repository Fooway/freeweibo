window.freeWeibo = window.freeWeibo || {};

window.freeWeibo.FetchTweets = (function() {

  function Fetcher(container) {
    this.container = container;
    this.target = $('<div id="spin"></div>').insertBefore($(this.container))[0];
    this.spinner = null;
    this.page_num = 0;
    this.current_page = 0;
    this.registerEvent();
  }


  // spinner
  Fetcher.prototype.opts = {
    lines: 13, // The number of lines to draw
    length: 10, // The length of each line
    width: 5, // The line thickness
    radius: 15, // The radius of the inner circle
    corners: 1, // Corner roundness (0..1)
    rotate: 0, // The rotation offset
    direction: 1, // 1: clockwise, -1: counterclockwise
    color: '#000', // #rgb or #rrggbb
    speed: 1, // Rounds per second
    trail: 60, // Afterglow percentage
    shadow: false, // Whether to render a shadow
    hwaccel: false, // Whether to use hardware acceleration
    className: 'spinner', // The CSS class to assign to the spinner
    zIndex: 2e9, // The z-index (defaults to 2000000000)
    top: '100', // Top position relative to parent in px
    left: 'auto' // Left position relative to parent in px
  };


  Fetcher.prototype.registerEvent = function() {
    var self = this;
    $(window).scroll((function() {
      var timerID = null;
      var timer = 200;
      return function() {
        clearTimeout(timerID);
        timerID = setTimeout(function() {
          if($(window).scrollTop() >= $(self.container).offset().top + $(self.container).height() - $(window).height()) {
            self.opts.top = $(self.container).height() + 70;
            self.spinner = new Spinner(self.opts).spin(self.target);
            self.getTweets();
          }
        }, timer);
      };
    })());

    $(self.container).on('click', '.thumb_img', function() {
      $(this).hide();
      $(this).next().show();
    });

    $(self.container).on('click', '.middle_img', function() {
      $(this).hide();
      $(this).prev().show();
    });
  };

  Fetcher.prototype.getTweets = function() {
    var self = this;
    if (self.page_num > self.current_page) {
      self.spinner.stop();
      return;
    }
    self.page_num++;
    $.get('/tweets', {page: self.page_num}, function(data) {
      if (data.err) {
        $(self.container).append('<p class="alert">' + data.err + '</p>');
        return;
      }
      if (data.tweets == '') {
        $(self.container).append('<p class="alert">所有记录已加载</p>');
        return;
      }
      $(self.container).append(data.tweets);
      self.current_page++;
    }).fail(function() {
      $(self.container).append('<p class="alert">加载失败</p>');
    }).always(function() { self.spinner.stop(); });
  };

  return Fetcher;

})();


window.freeWeibo.emailSubscribe = function(btn) {
  // subscribe function
  var $mail = $(btn).prev();
  var $alert = $(btn).parent('.input-append').next();
  $(btn).on('click', function () {
    // body...
    var pattern = /^[\w].[-.\w]*@[-\w]+\.[-\w]+/;
    var address = $mail.val().replace(/^\s+|\s+$/g,'');
    if (pattern.test(address)) {
      $.get('/subscribe', { email: address}, function(res) {
        if (res.err) {
          $alert.text('订阅失败！').css('color', 'red').show();
        } else {
          $alert.text('订阅成功！').css('color', 'green').show();
        }
        $mail.val('');
        setTimeout(function() {
          $alert.fadeOut(2000);
        }, 1000);

      });
    }
    else {
      $alert.text('无效的地址!').css('color', 'red').show();
      $mail.val('');
      setTimeout(function() { $alert.fadeOut(2000); }, 1000);
    }
  });
};

