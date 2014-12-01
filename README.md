# What's freeWeibo?

Freeweibo is a web service that automatically crawls microblogs on [weibo platform](http://weibo.com) that are blocked or deleted under the internet censorship by Chinese government. The whole process of this project has been covered in a [toptal blog](http://www.toptal.com/web/battling-censorship-in-china-how-i-built-a-censored-microblog-aggregator).

## Features

- Website show recently censored microblogs
- Email subscription for censored microblogs
- Add weibo user to crawl list

## How to use

- Register an [account](http://weibo.com/signup)
- Register 10 [apps](http://open.weibo.com) 

  _unless you register an app as advanced level which may require monthly charging, we need 10 free level apps to get around the rate limit on API interface_

- Config user account and app id in /crawler/config.js file
- refer to **run.sh** for setup

## Remote Deployment

- refer to **deploy.sh**
