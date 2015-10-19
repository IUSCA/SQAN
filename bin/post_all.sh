#find /N/geode/dicom/headers -name *.json | node post.js
#find /usr/local/dicom-raw/0000-00001 -name *.json | node post.js
find /usr/local/dicom-raw/0000-00001/10025 -name *.json | node post.js
