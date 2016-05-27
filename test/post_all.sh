#everything
#find /usr/local/dicom-raw -name *.json | node post.js

#find /N/geode/dicom/headers -name *.json | node post.js
#find /usr/local/dicom-raw/0000-00001 -name *.json | node post.js
#find /usr/local/dicom-raw/0000-00001/10004/1.2.840.113654.2.70.1.232633167093037837616831291427630771402/HighResHippo-fov175tr8020_FA122_iPAT2/1.2.840.113654.2.70.1.100969969384874901636490967190617991188.json -name *.json | node post.js

#mr
#find /usr/local/dicom-raw/2014-00006 -name *.json | node post.js
#find /usr/local/dicom-raw/0000-00001 -name *.json | node post.js
#pt/ct
#find /usr/local/dicom-raw/2014-00006 -name *.json | node post.js


#find "/usr/local/dicom-raw/2008-00003" -name *.json | node post.js
#find /usr/local/dicom-raw/2014-00169 -name *.json | node post.js
#find /usr/local/dicom-raw/2008-00050 -name *.json | node post.js
#find /usr/local/dicom-raw/2013-00131 -name *.json | node post.js
#find /usr/local/dicom-raw/2013-00107 -name *.json | node post.js
find /usr/local/dicom-raw/2015-00239 -name *.json | node ../bin/post.js

#mr (>100k?)
#find /usr/local/dicom-raw/0000-00001 -name *.json | node post.js

#echo /usr/local/dicom-raw/2013-00131/CSN009/1.2.840.113654.2.70.1.118773634537836566383844156645401151862/FBP_FAL_dynamic_90min_200/1.2.840.113654.2.70.1.66128441808582892090193881277589860568.json | node post.js
