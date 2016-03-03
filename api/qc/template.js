
var _ = require('underscore');

//custom QC logics to be applied to all modality (unless overridden)
var common_customs = {
    "AcquisitionNumber": skip, //not yet OK-ed by all of us..
    "AcquisitionDate": skip,
    "AcquisitionTime": skip,
    "AcquisitionDateTime": skip, //from CT..

    "FrameOfReferenceUID": skip,

    "ContentDate": skip,
    "ContentTime": skip,

    "DateOfLastCalibration": skip,
    "DeidentificationMethod": skip,
    "DeidentificationMethodCodeSequence": skip,

    "ImagePositionPatient": skip,

    "SeriesDate": skip,
    "SeriesInstanceUID": skip,
    "SeriesNumber": skip,
    "SeriesTime": skip,

    "StudyDate": skip,
    "StudyID": skip,
    "StudyInstanceUID": skip,
    "StudyTime": skip,

    "SOPInstanceUID": skip,
    "SOPClassUID": skip,

    "PatientAge": skip,
    "PatientBirthDate": skip,
    "PatientComments": skip,
    "PatientID": skip,
    "PatientName": skip,
    "PatientSex": skip,
    "PatientSize": skip,
    "PatientWeight": skip,
    "PatientIdentityRemoved": skip,

    "PixelData": skip,
    "PaletteColorLookupTableUID": skip,
    "RelatedSeriesSequence": skip, //we are receiving unhashed SOPInstanceUID inside this field. Sundar told me to skip this for now
    "SliceLocation": skip,
    "TableHeight": skip,
    "TimeOfLastCalibration": skip,
    "ReferringPhysicianName": skip,

    "Unknown Tag & Data": skip,
}

//custom QC logics specific to each modality
var customs = {
    "MR": _.extend({
        "AccessionNumber": skip,

        "BluePaletteColorLookupTableData": skip,
        "BluePaletteColorLookupTableDescriptor": skip,
        "CodeMeaning": skip,
        "CodeValue": skip,
        "CodingSchemeDesignator": skip,
        "CodingSchemeVersion": skip,
        "CommentsOnThePerformedProcedureStep": skip,

        "ContinuityOfContent": skip,
        "dBdt": skip,
        "GenericGroupLength": skip,
        "GreenPaletteColorLookupTableData": skip,
        "GreenPaletteColorLookupTableDescriptor": skip,
        "ImageComments": skip,
        "ImagingFrequency": skip,
        "ImplementationVersionName": skip,
        "InstanceCreationDate": skip,
        "InstanceCreationTime": skip,
        "LargestImagePixelValue": skip,
        "MappingResource": skip,
        "NumericValue": skip,
        "OperatorsName": skip,
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
        "RelationshipType": skip,
        "SequenceName": skip,
        "SequenceVariant": skip,
        "SmallestImagePixelValue": skip,
        "SpecificCharacterSet": skip,
        "StudyDate": skip,
        "StudyDescription": skip,
        "StudyID": skip,
        "StudyTime": skip,
        "TextValue": skip,
        "ValueType": skip,
        "VerificationFlag": skip,
        "WindowCenter": skip,
        "WindowCenterWidthExplanation": skip,
        "WindowWidth": skip,
    
        "SAR": skip,
        
    }, common_customs),

    "CT": _.extend({
        "CTDIPhantomTypeCodeSequence": skip,
        "CTDIvol": skip,
        "DataCollectionCenterPatient": skip,
        "EstimatedDoseSaving": skip,
        "Exposure": skip,
        "ExposureTime": skip,
        "IrradiationEventUID": skip,
        "ReconstructionTargetCenterPatient": skip,
    }, common_customs),

    "PT": _.extend({
        "ActualFrameDuration": skip,
        "DoseCalibrationFactor": skip,
        "FrameReferenceTime": skip,
        "ImagePositionPatient": skip,
        "LargestImagePixelValue": skip,
        "NumberOfTimeSlices ": function(k, v, tv, qc) {
            if(v === undefined) return; //ok if it doesn't exist This tag appears in dynamic PET scans only.
            check_equal(k, v, tv, qc);
        },

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
        "SmallestImagePixelValue": skip,
        "WindowCenter": skip,
        "WindowWidth": skip,

        //"InstanceNumber": skip,
    }, common_customs)
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
            //} else if(diff != 0) {
            } else if(diff > 0.0001) {
                qc.warnings.push({type: 'template_mismatch', k: k, v: v, tv: tv, perdiff: diff, msg: "value does not match within 0.0001% of the template value."});
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

