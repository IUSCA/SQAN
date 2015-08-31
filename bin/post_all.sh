#find /N/geode/dicom/headers -name *.json | node post.js
#find /usr/local/raw-dicom-headers -name *.json | node post.js
find /usr/local/tmp/headers -name *.json | node post.js
