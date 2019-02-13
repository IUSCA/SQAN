#mongo --eval 'db.images.count()' dicom

mongo --eval 'db.studies.update({}, {$unset: {qc: 1}}, {multi: true})' dicom
