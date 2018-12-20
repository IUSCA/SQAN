
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
    "CSAImageHeaderVersion": skip,
    "CSASeriesHeaderVersion": skip,

    "DateOfLastCalibration": skip,
    "DeidentificationMethod": skip,
    "DeidentificationMethodCodeSequence": skip,

    "ImagePositionPatient": skip,
    "ImageOrientationPatient" : function(k, v, tv, qc) {
        if(!check_set(k, v, tv, qc)) return;
        if(v.constructor === Array && tv.constructor === Array && v.length == tv.length) {
            v.forEach(function(av, idx) {
                check_absolute_diff(k, av, tv[idx], qc, 'errors', 0.3);
            });
        } else {
            qc.errors.push({type: 'template_mismatch', k: k, v: v, tv: tv, msg: "template and value do not match in type or length"});
        }
    },

    "MedComHistoryInformation": skip,

    "SeriesDate": skip,
    "SeriesInstanceUID": skip,
    "SeriesNumber": skip,
    "SeriesTime": skip,

    //SeriesDescription is used to find a template, so there is no point of QC-ing this
    "SeriesDescription": skip,

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
        "TriggerTime" : function(k, v, tv, qc) {
            if(!check_set(k, v, tv, qc)) return;
            var fv = convertToFloat(v, k);
            var ftv = convertToFloat(tv, k);
            check_absolute_diff(k, fv, ftv, qc, 'errors', 3);
        },
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
                delete tv[0].RadiopharmaceuticalStartDateTime
            }
            if(v[0]) {
                delete v[0].RadiopharmaceuticalStartTime;
                delete v[0].RadionuclideTotalDose;
                delete v[0].RadiopharmaceuticalStartDateTime
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


function skip(k, v, tv, qc) {check_set(k, v, tv, qc)}

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

function convertToFloat(v, f) {
    //if(v === undefined) return undefined;
    if(v === null) return null;
    if(v.constructor === Array) {
        var newa = [];
        v.forEach(function(av) {
            newa.push(convertToFloat(av, f+".array"));
        });
        return newa;
    } else {
        var i = parseFloat(v);
        if(i != v) console.error(f+":\""+v+"\" converted to " +i);
        /*
         var check = i.toString();
         if(v != check) {
         throw new Error(f+":"+v + " converted to " +i);
         }
         */
        return i;
    }
}

function check_absolute_diff(k, v, tv, qc, r, th) {
    var l = 'template_mismatch'

    var diff = Math.abs(v - tv);
    if(diff > th) {
        qc[r].push({type: l, k: k, v: v, tv: tv, msg: "value differs from template by more than "+th});
    };
};

function check_percent_diff(k, v, tv, qc, r, th) {
    var l = 'template_mismatch'

    var diff = Math.abs((v - tv)/((v+tv)/2));
    if(diff > th) {
        qc[r].push({type: l, k: k, v: v, tv: tv, msg: "value differs from template by more than "+th*100+"%"});
    };
};

//compare image headers against template headers
exports.match = function(image, template, qc) {

    var template_mismatch = 0;
    var not_set = 0;

    console.log("QC-ing image " + image.InstanceNumber + " with template " + template.InstanceNumber);

    //find exclusion list
    var cus = customs[image.headers.Modality];
    if(!cus) {
        qc.errors.push({type: 'unknown_modality', msg: "unknown modality "+image.headers.Modality+" found for image:"+image.id});
        return;
    }
    
    // find fileds that are in image and not in template
    var tl = Object.keys(template.headers).length;
    var il = Object.keys(image.headers).length;
    
    // first check if image header has fields that are not in the template    
    var keydiff = [];
    for (var kk in image.headers) {
        if(template.headers[kk] === undefined) keydiff.push({ik:kk,v:image.headers[kk]})
    }
    var lengthdiff = keydiff.length;
    if (lengthdiff > 0) qc.errors.push({type: 'image_tag_mismatch', k: keydiff, c: lengthdiff, msg: "image has "+ lengthdiff + " fields that are not found in the template"});

    //compare each field of the template with the corresponding filed in the image
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

    qc.errors.forEach(function(e) {
        if (e.type == 'template_mismatch') template_mismatch++;
        if (e.type == 'not_set') not_set++;
    })

    var error_stats = {
        template_mismatch: template_mismatch,        
        not_set: not_set,
        template_field_count: tl,
        image_field_count: il,
        image_tag_mismatch: lengthdiff 
    }

    qc.error_stats = error_stats;

}


function overwritte_template(template_id,new_event,cb) {

    console.log("overwritting template "+template_id)
        
    // Now Un-qc the series
    db.Template.update({
        _id: template_id,
    }, { $push: { events: new_event }}, 
    function(err) {   
        if(err) return cb(err);
        // deprecate all images in that series
        db.TemplateHeader.deleteMany({
            template_id: template_id,
        }, function(err) {
            if(err) return cb(err);
            return cb();
        })
    })
}


exports.cc = common_customs;
exports.c = customs;
exports.overwritte_template = overwritte_template;
