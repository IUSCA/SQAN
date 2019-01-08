 #!/bin/bash
   
for iibis in `ls /opt/sca/dicom-backup/dicom-raw`;
do
     for subj in `ls /opt/sca/dicom-backup/dicom-raw/"${iibis}"/`; 
     do 
         #echo "${subj}"; 
         for sdir in `ls /opt/sca/dicom-backup/dicom-raw/"${iibis}"/"${subj}"`;
         do  
            #ls -lat /opt/sca/dicom-raw/"${iibis}"/"${subj}"/"${sdir}";
            find /opt/sca/dicom-backup/dicom-raw/"${iibis}"/"${subj}"/"${sdir}" -iname "*.json" | node /opt/sca/rady-qc/bin/post.js;
            sleep 30s
         done
     done
done




