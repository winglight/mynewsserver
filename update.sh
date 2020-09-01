#!/usr/bin/env bash
# git pull

# cd react-ui/ && npm install && npm install --only=dev --no-shrinkwrap && npm run build

# cd ..

pm2 stop crawler

pm2 stop index

pm2 start index.js

pm2 start ../mynewsback/src/crawler.js --cron "* */2 * * *"

