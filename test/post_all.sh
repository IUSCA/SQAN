 #!/bin/bash
   
for iibis in `ls /opt/sca/dicom-raw/ |grep 0000-00`;
do
     for subj in `ls /opt/sca/dicom-raw/"${iibis}"/`; 
     do 
         #echo "${subj}"; 
         for sdir in `ls /opt/sca/dicom-raw/"${iibis}"/"${subj}"`;
         do  
            #ls -lat /opt/sca/dicom-raw/"${iibis}"/"${subj}"/"${sdir}";
            find /opt/sca/dicom-raw/"${iibis}"/"${subj}"/"${sdir}" -iname "*.json" | node /opt/sca/rady-qc/bin/post.js;
            sleep 100s
         done
     done
done

find /opt/sca/dicom-raw/0000-00* -iname "*.json" | wc -l


