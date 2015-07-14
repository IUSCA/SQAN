#!/bin/bash

incoming=/usr/local/incoming-dicom-headers/
analyzed=/usr/local/analyzed-dicom-headers
for dir in $(find $incoming -mindepth 1 -maxdepth 1 -type d)
do
    #$dir/`basename $dir`
    #find /usr/local/incoming-dicom-headers/* | node analyze.js >  
    echo "analyzing $dir"
    node analyze $dir 
    if [ $? -eq 0 ]; then
        #echo "storing analysis.json on $dir"
        #mv /tmp/analysis.json $dir #copy to incoming dir before moving to analyzed
        mv $dir $analyzed
    else
        echo "failed to analyze $dir - (should I move it failed dir?)"
    fi
done
