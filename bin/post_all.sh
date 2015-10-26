#find /N/geode/dicom/headers -name *.json | node post.js
#find /usr/local/dicom-raw/0000-00001 -name *.json | node post.js
#find /usr/local/dicom-raw/0000-00001/10613/1.2.840.113654.2.70.1.199620938948991317340740310665413838665 -name *.json | node post.js
#find /usr/local/dicom-raw/2008-00050 -name *.json | node post.js
find /usr/local/dicom-raw/2014-00004 -name *.json | node post.js
