function FetchTweet(container, spin) {
  // spinner
  var opts = {
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

  var target = document.getElementById(spin);
  var spinner;


  var page_num = 0;
  var current_page = 0;
  function getTweets() {
    if (page_num > current_page) {
      spinner.stop();
      return;
    }
    page_num++;
    $.get(container, {page: page_num}, function(data) {
      if (data.err) {
        $(container).append('<p class="alert">' + data.err + '</p>');
        return;
      }
      if (data.tweets == '') {
        $(container).append('<p class="alert">所有记录已加载</p>');
        return;
      }
      $(container).append(data.tweets);
      current_page++;
    }).fail(function() {
      $(container).append('<p class="alert">加载失败</p>');
    }).always(function() { spinner.stop(); });
  }

  $(window).scroll((function() {
    var timerID = null;
    var timer = 200;

    return function() {
      clearTimeout(timerID);
      timerID = setTimeout(function() {
        if($(window).scrollTop() >= $(container).offset().top + $(container).height() - $(window).height()) {
          opts.top = $(container).height() + 70;
          spinner = new Spinner(opts).spin(target);
          getTweets();
        }
      }, timer);
    };
  })());

  $(container).on('click', '.thumb_img', function() {
    $(this).hide();
    $(this).next().show();
  });

  $(container).on('click', '.middle_img', function() {
    $(this).hide();
    $(this).prev().show();
  });
}

function EmailSubscribe(mail_bx, btn, tip_spn) {
  // subscribe function
  $(btn).on('click', function () {
    // body...
    var pattern = /^[\w].[-.\w]*@[-\w]+\.[-\w]+/;
    var address = $(mail_bx).val().replace(/^\s+|\s+$/g,'');
    if (pattern.test(address)) {
      $.get('/subscribe', { email: address}, function(res) {
        if (res.err) {
          $(tip_spn).text('订阅失败！').css('color', 'red').show();
        } else {
          $(tip_spn).text('订阅成功！').css('color', 'green').show();
        }
        $(mail_bx).val('');
        setTimeout(function() {
          $(tip_spn).fadeOut(2000);
        }, 1000);

      });
    }
    else {
      $(tip_spn).text('无效的地址!').css('color', 'red').show();
      $(mail_bx).val('');
      setTimeout(function() {
        $(tip_spn).fadeOut(2000);
      }, 1000);
    }
  });
}

