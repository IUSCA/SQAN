pm2 delete qc
pm2 start bin/qc.js --watch --ignore-watch="\.log$ \.sh$ ui \.git"
#pm2 logs qc

pm2 delete qc_series
pm2 start bin/qc_series.js --watch --ignore-watch="\.log$ \.sh$ ui \.git"
#pm2 logs qc_series

pm2 save
