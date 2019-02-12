
pm2 delete rady-api
pm2 start api/dicom.js --name="rady-api" --output /opt/sca/tmp/.pm2/logs/rady-api.out --error /opt/sca/tmp/.pm2/logs/rady-api.err

pm2 delete rady-incoming
pm2 start bin/incoming.js --name="rady-incoming"  --output /opt/sca/tmp/.pm2/logs/rady-incoming.out --error /opt/sca/tmp/.pm2/logs/rady-incoming.err

pm2 delete qc
pm2 start bin/qc.js --name="qc"  --output /opt/sca/tmp/.pm2/logs/qc.out --error /opt/sca/tmp/.pm2/logs/qc.err

pm2 save
