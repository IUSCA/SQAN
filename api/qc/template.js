
var _ = require('underscore');

var customs = {
    "MR": {
        "AccessionNumber": skip,
        "AcquisitionDate": skip,
        "AcquisitionNumber": skip,
        "AcquisitionTime": skip,

        "BluePaletteColorLookupTableData": skip,
        "BluePaletteColorLookupTableDescriptor": skip,
        "CodeMeaning": skip,
        "CodeValue": skip,
        "CodingSchemeDesignator": skip,
        "CodingSchemeVersion": skip,
        "CommentsOnThePerformedProcedureStep": skip,
        "ContentDate": skip,
        "ContentTime": skip,

        "ContinuityOfContent": skip,
        "DateOfLastCalibration": skip,
        "dBdt": skip,
        "GenericGroupLength": skip,
        "GreenPaletteColorLookupTableData": skip,
        "GreenPaletteColorLookupTableDescriptor": skip,
        "ImageComments": skip,
        "ImagePositionPatient": skip,
        "ImagingFrequency": skip,
        "ImplementationVersionName": skip,
        "InstanceCreationDate": skip,
        "InstanceCreationTime": skip,
        "LargestImagePixelValue": skip,
        "MappingResource": skip,
        "NumericValue": skip,
        "OperatorsName": skip,
        "PatientAge": skip,
        "PatientBirthDate": skip,
        "PatientComments": skip,
        "PatientID": skip,
        "PatientName": skip,
        "PatientSex": skip,
        "PatientSize": skip,
        "PatientWeight": skip,
        "PerformedProcedureStepDescription": skip,
        "PerformedProcedureStepID": skip,
        "PerformedProcedureStepStartDate": skip,
        "PerformedProcedureStepStartTime": skip,
        "PerformingPhysicianName": skip,
        "PersonName": skip,
        "PhotometricInterpretation": skip,
        "PrivateCreator": skip,
        "PrivateGroupLength": skip,
        "RedPaletteColorLookupTableData": skip,
        "RedPaletteColorLookupTableDescriptor": skip,
        "ReferringPhysicianName": skip,
        "RelationshipType": skip,
        "SequenceName": skip,
        "SequenceVariant": skip,
        "SeriesDate": skip,
        "SeriesNumber": skip,
        "SeriesTime": skip,
        "SliceLocation": skip,
        "SmallestImagePixelValue": skip,
        "SpecificCharacterSet": skip,
        "StudyDate": skip,
        "StudyDescription": skip,
        "StudyID": skip,
        "StudyTime": skip,
        "TextValue": skip,
        "TimeOfLastCalibration": skip,
        "ValueType": skip,
        "VerificationFlag": skip,
        "WindowCenter": skip,
        "WindowCenterWidthExplanation": skip,
        "WindowWidth": skip,
    
        "StudyInstanceUID": skip,
        "SeriesInstanceUID": skip,
        "SOPInstanceUID": skip,
        "SOPClassUID": skip,
        "SAR": skip,
        "PixelData": skip,
        "PatientIdentityRemoved": skip,
        "FrameOfReferenceUID": skip,
        "DeidentificationMethodCodeSequence": skip,
        "DeidentificationMethod": skip,
        
        "PatientName": skip,
        "ImagePositionPatient": skip,
        "TableHeight": skip,
        "RelatedSeriesSequence": skip,
        "Unknown Tag & Data": skip,
    },
    "CT": {
        "AcquisitionDate": skip,
        "AcquisitionDateTime": skip,
        "AcquisitionTime": skip,
        "ContentDate": skip,
        "ContentTime": skip,
        "CTDIPhantomTypeCodeSequence": skip,
        "CTDIvol": skip,
        "DataCollectionCenterPatient": skip,
        "DateOfLastCalibration": skip,
        "DeidentificationMethod": skip,
        "DeidentificationMethodCodeSequence": skip,
        "EstimatedDoseSaving": skip,
        "Exposure": skip,
        "ExposureTime": skip,
        "FrameOfReferenceUID": skip,
        "ImagePositionPatient": skip,
        "IrradiationEventUID": skip,
        "PatientAge": skip,
        "PatientBirthDate": skip,
        "PatientIdentityRemoved": skip,
        "PatientName": skip,
        "PatientSex": skip,
        "PatientSize": skip,
        "PatientWeight": skip,
        "PixelData": skip,
        "ReconstructionTargetCenterPatient": skip,
        "ReferringPhysicianName": skip,
        "SeriesDate": skip,
        "SeriesInstanceUID": skip,
        "SeriesNumber": skip,
        "SeriesTime": skip,
        "SliceLocation": skip,
        "SOPClassUID": skip,
        "SOPInstanceUID": skip,
        "StudyDate": skip,
        "StudyID": skip,
        "StudyInstanceUID": skip,
        "StudyTime": skip,
        "TimeOfLastCalibration": skip,
        "Unknown Tag & Data": skip,
        "TableHeight": skip,
        "RelatedSeriesSequence": skip,
    },
    "PT": {
        "AcquisitionDate": skip,
        "AcquisitionTime": skip,
        "ActualFrameDuration": skip,
        "ContentDate": skip,
        "ContentTime": skip,
        "DateOfLastCalibration": skip,
        "DeidentificationMethod": skip,
        "DeidentificationMethodCodeSequence": skip,
        "DoseCalibrationFactor": skip,
        "FrameOfReferenceUID": skip,
        "FrameReferenceTime": skip,
        "ImagePositionPatient": skip,
        "LargestImagePixelValue": skip,
        "NumberOfTimeSlices ": function(k, v, tv, qc) {
            if(v === undefined) return; //ok if it doesn't exist This tag appears in dynamic PET scans only.
            check_equal(k, v, tv, qc);
        },
        "PaletteColorLookupTableUID": skip,
        "PatientAge": skip,
        "PatientBirthDate": skip,
        "PatientIdentityRemoved": skip,
        "PatientName": skip,
        "PatientSex": skip,
        "PatientSize": skip,
        "PatientWeight": skip,
        "PixelData": skip,

        "RadiopharmaceuticalInformationSequence": function(k, v, tv, qc) {
            if(!check_set(k, v, tv, qc)) return;
            //sometimes they are not set..
            if(tv[0]) {
                delete tv[0].RadiopharmaceuticalStartTime;
                delete tv[0].RadionuclideTotalDose;
            }
            if(v[0]) {
                delete v[0].RadiopharmaceuticalStartTime; 
                delete v[0].RadionuclideTotalDose; 
            }
            check_equal(k, v, tv, qc);
        },
        "ReferringPhysicianName": skip,

        //we are receiving unhashed SOPInstanceUID inside this field. Sundar told me to skip this for now
        "RelatedSeriesSequence": skip,
        /*
        "RelatedSeriesSequence": function(k, v, tv, qc) {
            if(!check_set(k, v, tv, qc)) return;
            delete tv[0].StudyInstanceUID;
            delete v[0].StudyInstanceUID;
            delete tv[0].SeriesInstanceUID;
            delete v[0].SeriesInstanceUID;
            check_equal(k, v, tv, qc);
        },
        */

        "RescaleIntercept": skip,
        "RescaleSlope": skip,
        "ScatterFractionFactor": skip,
        "SeriesDate": skip,
        "SeriesInstanceUID": skip,
        "SeriesNumber": skip,
        "SeriesTime": skip,
        "SliceLocation": skip,
        "SmallestImagePixelValue": skip,
        "SOPClassUID": skip,
        "SOPInstanceUID": skip,
        "StudyDate": skip,
        "StudyID": skip,
        "StudyInstanceUID": skip,
        "StudyTime": skip,
        "TimeOfLastCalibration": skip,
        "Unknown Tag & Data": skip,
        "WindowCenter": skip,
        "WindowWidth": skip,

        //"InstanceNumber": skip,
        "TableHeight": skip,
    }
};

function skip(k, v, tv, qc) {
    return;
}

function check_set(k, v, tv, qc) {
    //raise error if the field is missing
    if(v === undefined) {
        qc.errors.push({type: 'not_set', k: k, tv: tv, msg: "key is missing"});
        return false;
    }
    return true;
}

//just compare v v.s. tv and raise error if they don't match
function check_equal(k, v, tv, qc) {
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
}

//compare image headers against template headers
exports.match = function(image, template, qc) {

    //find exclusion list
    var cus = customs[image.headers.Modality];
    if(!cus) {
        qc.errors.push({type: 'unknown_modality', msg: "unknown modality "+image.headers.Modality+" found for image:"+image.id});
        return;
    }
    
    //compare each fields
    for(var k in template.headers) {
        var v = image.headers[k];
        var tv = template.headers[k];
        if(k.indexOf("qc_") === 0) continue;//ignore all qc fields
        if(cus[k]) {
            cus[k](k, v, tv, qc);
        } else {
            if(!check_set(k, v, tv, qc)) continue;
            check_equal(k, v, tv, qc);
        }
    }; 
}

