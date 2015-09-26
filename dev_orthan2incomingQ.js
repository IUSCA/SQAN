orthanc2incomingQ.js*

pm2 delete orthanc2incomingQ
pm2 start bin/orthanc2incomingQ.js --watch --ignore-watch="\.log$ \.sh$"
pm2 logs orthanc2incomingQ
