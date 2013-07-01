window.freeWeibo = window.freeWeibo || {};

window.freeWeibo.Fetcher= (function() {
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

  function Fetcher(container, offset, limit) {
    this.container = $(container);
    this.offset = offset || 0;
    this.limit = limit || 30;

    this.init();
  }

  Fetcher.prototype.init = function() {

    this.isPending = false;
    this.allLoaded = false;

    this.spinner = null;
    this.target = $('<div id="spin"></div>').insertBefore(this.container)[0];

    this.registerEvent();
  }

  Fetcher.prototype.registerEvent = function() {
    var self = this;

    $(window).scroll(
      deBounce(function() {
        var containBottom = self.container.offset().top + 
                            self.container.height() - $(window).height();

        if($(window).scrollTop() >= containBottom) {
          spinOpts.top = self.container.height() + 70;
          self.getTweets();
        }
      })
    );

    self.container.on('click', '.thumb_img', function() {
      $(this).hide();
      $(this).next().show();
    });

    self.container.on('click', '.middle_img', function() {
      $(this).hide();
      $(this).prev().show();
    });
  };

  Fetcher.prototype.getTweets = function() {
    var self = this;

    if (self.isPending || self.allLoaded) {
      return;
    }

    self.container.children('.alert').remove();
    self.isPending = true;
    self.spinner = new Spinner(spinOpts).spin(self.target);

    $.ajax({data:{offset: self.offset, limit: self.limit}}).done(function(data) {
      if (data.error) {
        self.container.append('<p class="alert">' + data.error + '</p>');
      } else  {
        if (data.count == 0) {
          self.container.append('<p class="alert">所有记录已加载</p>');
          self.allLoaded = true;
        } else {
          self.offset += data.count;
          self.container.append(data.tweets);
        }
      }
    }).fail(function() {
      self.container.append('<p class="alert">加载失败</p>');
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


// email subscriber
window.freeWeibo.Subscriber = (function() {
  function Subscriber(option, callback) {
    this.button = $('.subscriber');
    this.pattern = option.pattern;
    this.location = option.location;
    this.callback = callback;
    this.init();

  }

  Subscriber.prototype.init = function() {
    this.input = this.button.prev();
    this.alert = this.button.parent('.input-append').next();
    this.registerEvent();

  }

  Subscriber.prototype.registerEvent = function() {
    var self = this;

    self.button.on('click', function() {
      var pattern = self.pattern;
      var input = self.input.val().replace(/^\s+|\s+$/g,'');

      if (pattern && !pattern.test(input)) {
        self.alert.text('无效的输入!').css('color', 'red').show();
        self.input.val('');
        setTimeout(function() { self.alert.fadeOut(2000); }, 1000);
      } else {
        $.post(self.location, { data: input}, function(res) {
          if (res.error) {
            self.alert.text('提交失败！').css('color', 'red').show();
          } else {
            self.alert.text('提交成功！').css('color', 'green').show();

            if (self.callback) {
              self.callback(res.data);
            }
          }

          self.input.val('');
          setTimeout(function() {
            self.alert.fadeOut(2000);
          }, 1000);

        });
      }
    });
  }

  return Subscriber;

})();

window.freeWeibo.login = function () {
  $('form .btn').on('click', function(e) {
    e.preventDefault();
    var name = $('form #username').val();
    var password = $('form #password').val();
    console.log('start send login...');
    $.post('/author', {username: name, password: password}, function(res) {
      if (res.status) {
        document.location.href = '/admin';
        console.log('login success');
      } else {
        alert('authorize fail!');
      }
    });
  });
}

$(function() {
  $('.users').on('click', '.rm-user', function() {
    var userid = parseInt($(this).prev().attr('href').replace('//weibo.com/u/', ''));

    $(this).parents('li').remove();
    $.post('/delete-user', { data: userid}, function() {});
  });

  // highlight search item
  var search = window.location.search.substring(1) || 'time=all';
  $('.span3 a[href$="' + search + '"]').parents('li').addClass('highlight');

});

