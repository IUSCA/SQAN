pm2 delete qc
pm2 start qc.js --watch --ignore-watch="\.log$ \.sh$"
#pm2 logs qc

#pm2 delete qc_study
#pm2 start qc_study.js --watch --ignore-watch="\.log$ \.sh$"
#pm2 logs qc_study

pm2 save
