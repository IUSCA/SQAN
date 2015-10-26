pm2 delete orthanc2incomingQ
pm2 start orthanc2incomingQ.js --watch --ignore-watch="\.log$ \.sh$"
pm2 save
#pm2 logs orthanc2incomingQ
