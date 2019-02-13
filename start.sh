#!/usr/bin/env bash

pm2 delete rady-api
pm2 start api/dicom.js --name="rady-api" --output /opt/sca/var/log/rady-api.out \
 --error /opt/sca/var/log/rady-api.err --watch --ignore-watch="\.log \.git \.sh bin ui"

pm2 delete rady-incoming
pm2 start bin/incoming.js --name="rady-incoming"  --output /opt/sca/var/log/rady-incoming.out  \
 --error /opt/sca/var/log/rady-incoming.err

pm2 delete rady-qc
pm2 start bin/qc.js --name="rady-qc"  --output /opt/sca/var/log/rady-qc.out --error /opt/sca/var/log/rady-qc.err

pm2 save
