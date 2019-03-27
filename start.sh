#!/usr/bin/env bash

pm2 delete test-rady-api
pm2 start api/dicom.js --name="test-rady-api" --output /opt/sca/var/log/test-rady-api.out \
 --error /opt/sca/var/log/test-rady-api.err --watch --ignore-watch="\.log \.git \.sh bin ui"

pm2 delete test-rady-incoming
pm2 start bin/incoming.js --name="test-rady-incoming"  --output /opt/sca/var/log/test-rady-incoming.out  \
 --error /opt/sca/var/log/test-rady-incoming.err

pm2 delete test-rady-qc
pm2 start bin/qc.js --name="test-rady-qc"  --output /opt/sca/var/log/test-rady-qc.out --error /opt/sca/var/log/test-rady-qc.err

pm2 save
