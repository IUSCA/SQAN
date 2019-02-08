
pm2 delete rady-api
pm2 start api/dicom.js --name="rady-api" --output /opt/sca/tmp/.pm2/logs/rady-api.out --error /opt/sca/tmp/.pm2/logs/rady-api.err

pm2 delete incoming
pm2 start bin/incoming.js --name="incoming" --output /opt/sca/tmp/.pm2/logs/incoming.out --error /opt/sca/tmp/.pm2/logs/incoming.err
#pm2 logs cleanAndStore

#pm2 delete orthanc2incomingQ
#pm2 start bin/orthanc2incomingQ.js --name="orthanc2incomingQ"  --output /opt/sca/tmp/.pm2/logs/orthanc2incomingQ.out --error /opt/sca/tmp/.pm2/logs/orthanc2incomingQ.err

pm2 delete qc
pm2 start bin/qc.js --name="qc"  --output /opt/sca/tmp/.pm2/logs/qc.out --error /opt/sca/tmp/.pm2/logs/qc.err

#pm2 delete qc_exams
#pm2 start bin/qc_exams.js --name="qc_exams" --watch --ignore-watch="\.log$ \.sh$ ui \.git" --output /opt/sca/tmp/.pm2/logs/qc_exams.out --error /opt/sca/tmp/.pm2/logs/qc_exams.err

pm2 save
