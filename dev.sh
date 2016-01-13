#DEBUG=qc:* PORT=12048 nohup nodemon -i bin -i barn -i test -i ui ./www > nohup_server.out &

pm2 delete dicom
pm2 start api/dicom.js --watch --ignore-watch="\.log$ .sh$"
pm2 save
