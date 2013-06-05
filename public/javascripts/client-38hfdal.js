window.freeWeibo = window.freeWeibo || {};

window.freeWeibo.Tweets = (function() {
  // spinner option
  var spinOpts = {
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

  function Fetcher(container) {
    this.container = container;
    this.init();
  }

  Fetcher.prototype.init = function() {
    this.offset = 0;
    this.limit = 30;

    this.isPending = false;
    this.allLoaded = false;

    this.spinner = null;
    this.target = $('<div id="spin"></div>').insertBefore($(this.container))[0];

    this.registerEvent();
  }

  Fetcher.prototype.registerEvent = function() {
    var self = this;

    $(window).scroll(
      deBounce(function() {
        var containBottom = $(self.container).offset().top + 
                            $(self.container).height() - $(window).height();

        if($(window).scrollTop() >= containBottom) {
          spinOpts.top = $(self.container).height() + 70;
          self.getTweets();
        }
      })
    );

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

    if (self.isPending || self.allLoaded) {
      return;
    }

    self.isPending = true;
    self.spinner = new Spinner(spinOpts).spin(self.target);

    $.get('/tweets', {offset: self.offset, limit: self.limit}, function(data) {
      if (data.error) {
        $(self.container).append('<p class="alert">' + data.error + '</p>');
      } else  {
        if (!data.count) {
          $(self.container).append('<p class="alert">所有记录已加载</p>');
          self.allLoaded = true;
        }

        self.offset += data.count;
        $(self.container).append(data.tweets);
      }
    }).fail(function() {
      $(self.container).append('<p class="alert">加载失败</p>');
    }).always(function() { 
      self.spinner.stop(); 
      self.isPending = false;
    });

  };

  // debounce scroll events handler at interval 200ms
  function deBounce(cb) {
    var timerId = null;
    var interval = 200;

    return function() {
      clearTimeout(timerId);
      timerId = setTimeout(function() { cb(); }, interval);
    };

  }

  return Fetcher;

})();


// email subscribe function
window.freeWeibo.Subscriber = function(btn) {
  var $mail = $(btn).prev();
  var $alert = $(btn).parent('.input-append').next();

  $(btn).on('click', function () {
    var pattern = /^[\w].[-.\w]*@[-\w]+\.[-\w]+/;
    var address = $mail.val().replace(/^\s+|\s+$/g,'');

    if (pattern.test(address)) {
      $.get('/subscribe', { email: address }, function(res) {
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
    } else {
      $alert.text('无效的地址!').css('color', 'red').show();
      $mail.val('');
      setTimeout(function() { $alert.fadeOut(2000); }, 1000);
    }
  });
};

