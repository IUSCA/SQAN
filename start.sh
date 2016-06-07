
pm2 delete dicom
pm2 start api/dicom.js --watch --ignore-watch="\.log \.git \.sh bin ui"

pm2 delete cleanAndStore
pm2 start bin/cleanAndStore.js --watch --ignore-watch="\.log$ \.css$ \.less$ \.sh$ ui"
#pm2 logs cleanAndStore

pm2 delete orthanc2incomingQ
pm2 start bin/orthanc2incomingQ.js --watch --ignore-watch="\.git \.log$ \.css$ \.less$ \.sh$ ui"

pm2 delete qc
pm2 start bin/qc.js --watch --ignore-watch="\.log$ \.sh$ ui \.git"

pm2 delete qc_series
pm2 start bin/qc_series.js --watch --ignore-watch="\.log$ \.sh$ ui \.git"

pm2 save
