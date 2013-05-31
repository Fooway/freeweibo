#!/bin/bash
DIR=/var/www/filterback
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
NODE_PATH=/usr/local/lib/node_modules
NODE=/usr/bin/node

test -x $NODE || exit 0

function start_app {
  DEBUG=fetcher NODE_ENV=production nohup "$NODE" "$DIR/app.js" 1>>"$DIR/logs/run.log" 2>>"$DIR/logs/errors.log" &
  echo $! > "$DIR/pids/filterback.pid"
}

function stop_app {
  kill `cat $DIR/pids/filterback.pid`
}

case $1 in
   start)
      start_app ;;
    stop)
      stop_app ;;
    restart)
      stop_app
      start_app
      ;;
    *)
      echo "usage: filterback {start|stop}" ;;
esac
exit 0
