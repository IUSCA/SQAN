#mongo --eval 'db.images.count()' dicom

mongo --eval 'db.images.update({}, {$unset: {qc: 1}}, {multi: true})' dicom

#mongo --eval 'db.images.update({series_id: ObjectId("5643f94d726f2eaa72f643b3")}, {$unset: {qc: 1}}, {multi: true})' dicom
#mongo --eval 'db.images.update({_id: ObjectId("5643f951726f2eaa72f6440a")}, {$unset: {qc: 1}}, {multi: true})' dicom
