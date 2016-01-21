pm2 delete orthanc2incomingQ
pm2 start bin/orthanc2incomingQ.js --watch --ignore-watch="\.git \.log$ \.css$ \.less$ \.sh$ ui"
pm2 save
#pm2 logs orthanc2incomingQ
