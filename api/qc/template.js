
var _ = require('underscore');

var exclusions = {
    "MR": [
        "dBdt",
        "WindowWidth",
        "WindowCenterWidthExplanation",
        "WindowCenter",
        "StudyTime",
        "Unknown Tag & Data",
        "StudyInstanceUID",
        "StudyID",
        "StudyDate",
        "SpecificCharacterSet",
        "SmallestImagePixelValue",
        "SliceLocation",
        "SeriesTime",
        "SeriesNumber",
        "SeriesInstanceUID",
        "SeriesDate",
        "SequenceVariant",
        "SOPInstanceUID",
        "SOPClassUID",
        "SAR",
        "ReferringPhysicianName",
        "PrivateCreator",
        "PixelData",
        "PhotometricInterpretation",
        "PatientWeight",
        "PatientSize",
        "PatientSex",
        "PatientIdentityRemoved",
        "PatientBirthDate",
        "PatientAge",
        "LargestImagePixelValue",
        //"InstanceNumber",
        "InstanceCreationTime",
        "InstanceCreationDate",
        "ImagingFrequency",
        "ImagePositionPatient",
        "FrameOfReferenceUID",
        "DeidentificationMethodCodeSequence",
        "DeidentificationMethod",
        "ContentTime",
        "ContentDate",
        "AcquisitionTime",
        "AcquisitionNumber",
        "AcquisitionDate",
        
        "PatientName",
        "SequenceName",
        "ImagePositionPatient",
        "TableHeight",
        "RelatedSeriesSequence",
    ],
    "CT": [
        "AcquisitionDate",
        "AcquisitionDateTime",
        "AcquisitionTime",
        "ContentDate",
        "ContentTime",
        "CTDIPhantomTypeCodeSequence",
        "CTDIvol",
        "DataCollectionCenterPatient",
        "DateOfLastCalibration",
        "DeidentificationMethod",
        "DeidentificationMethodCodeSequence",
        "EstimatedDoseSaving",
        "Exposure",
        "ExposureTime",
        "FrameOfReferenceUID",
        "ImagePositionPatient",
        "IrradiationEventUID",
        "PatientAge",
        "PatientBirthDate",
        "PatientIdentityRemoved",
        "PatientName",
        "PatientSex",
        "PatientSize",
        "PatientWeight",
        "PixelData",
        "ReconstructionTargetCenterPatient",
        "ReferringPhysicianName",
        "SeriesDate",
        "SeriesInstanceUID",
        "SeriesNumber",
        "SeriesTime",
        "SliceLocation",
        "SOPClassUID",
        "SOPInstanceUID",
        "StudyDate",
        "StudyID",
        "StudyInstanceUID",
        "StudyTime",
        "TimeOfLastCalibration",
        "Unknown Tag & Data",
        "TableHeight",
        "RelatedSeriesSequence",
    ],
    "PT": [
        "AcquisitionDate",
        "AcquisitionTime",
        "ContentDate",
        "ContentTime",
        "DateOfLastCalibration",
        "DeidentificationMethod",
        "DeidentificationMethodCodeSequence",
        "FrameOfReferenceUID",
        "FrameReferenceTime",
        "PatientAge",
        "PatientBirthDate",
        "PatientIdentityRemoved",
        "PatientName",
        "PatientSex",
        "PatientSize",
        "PatientWeight",
        "ReferringPhysicianName",
        "SeriesDate",
        "SeriesInstanceUID",
        "SeriesNumber",
        "SeriesTime",
        "SOPClassUID",
        "SOPInstanceUID",
        "StudyDate",
        "StudyID",
        "StudyInstanceUID",
        "StudyTime",
        "TimeOfLastCalibration",
        "Unknown Tag & Data",

        //"InstanceNumber",
        "ImagePositionPatient",
        "TableHeight",
        "RelatedSeriesSequence",
    ]
};

//compare image headers against template headers
exports.match = function(image, template, qc) {

    //find exclusion list
    var exs = exclusions[image.headers.Modality];
    if(!exs) {
        qc.errors.push({type: 'unknown_modality', msg: "unknown modality "+image.headers.Modality+" found for image:"+image.id});
        return;
    }
    
    //compare each fields
    for(var k in template.headers) {
        var v = image.headers[k];
        var tv = template.headers[k];
        if(exs && ~exs.indexOf(k)) continue;//ignore fields in exclusion list
        if(k.indexOf("qc_") === 0) continue;//ignore qc fields

        //raise error if the field is missing
        if(v === undefined) {
            qc.errors.push({type: 'not_set', k: k, tv: tv, msg: "key is missing"});
            continue;
        }

        //now the fun part
        if(typeof v === 'number') {
            //sundar (Regarding ranges, for example: we can use color green for +/-  for target 0.01% difference. Color Yellow for 10% difference, and color Red beyond.)
            if(v == 0 && tv == 0) {
                //both 0.. can't calculate percent difference (and it matches!)
            } else {
                //compute percent diff.
                var diff = Math.abs((v - tv)/((v+tv)/2));
                if(diff > 0.1) {
                    qc.errors.push({type: 'template_mismatch', k: k, v: v, tv: tv, perdiff: diff, msg: "value is more than 10% off template value."});
                /*
                } else if(diff > 0.01) {
                    qc.warnings.push({type: 'template_mismatch', k: k, v: v, tv: tv, msg: "value is more than 0.01% off template value"});
                } else if (diff != 0) {
                    qc.warnings.push({type: 'template_mismatch', k: k, v: v, tv: tv, msg: "value is not exact match template value:"+diff});
                }
                */
                } else if(diff != 0) {
                    qc.warnings.push({type: 'template_mismatch', k: k, v: v, tv: tv, perdiff: diff, msg: "value does not match the template value."});
                }
            }
        } else {
            //string / array of something
            if(!_.isEqual(v, tv)) {
                qc.errors.push({type: 'template_mismatch', k: k, v: v, tv: tv, msg: "value doesn't match with template value"});
            }
        }
    }; 
}

