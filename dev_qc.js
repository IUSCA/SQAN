pm2 delete qc
pm2 start bin/qc.js --watch --ignore-watch="\.log$ \.sh$ ^ui/"
#pm2 logs qc

pm2 delete qc_study
pm2 start bin/qc_study.js --watch --ignore-watch="\.log$ \.sh$ ^ui/"
#pm2 logs qc_study

pm2 save
