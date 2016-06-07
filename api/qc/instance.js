'use strict';

//hide some fields, or problematic values on some fields
function maskFields(h) {

    /* This masking is now done at the CTP level
    //IRB requirement to make older patient (less number of them) to be more difficult to identify.
    if(h.qc_PatientAge && h.qc_PatientAge > 89) {
        h.qc_PatientAgeMasked = true;
        //sundar wants to do set it to 89 years - instead of removing them
        h.qc_PatientAge = 89; 
        h.PatientAge = "089Y"; 
    }
    */
    
    //soichi's arbitrary decision to remove some large fields containing relationship to other images 
    //TODO - maybe store this relationship in the DB?
    if(h.SourceImageSequence) h.SourceImageSequence = "(masked)";
    if(h.ReferencedImageSequence) h.ReferencedImageSequence = "(masked)";
}

//convert string fields to int / float
function convertTypes(h) {

    //convert values that contain backslash into array of values 
    for(var key in h) {
        var v = h[key];
        if(v != null && v.indexOf && v.indexOf("\\") !== -1) {
            h[key] = v.split('\\');
        }
    }
    
    //convert field types
    var int_fields = [
        "AcquisitionMatrix",
        "AcquisitionNumber",
        "BitsAllocated",
        "BitsStored",
        "Columns",
        "EchoNumbers",
        "EchoTrainLength",
        "FlipAngle",
        "HighBit",
        "InstanceNumber",
        "LargestImagePixelValue",
        "MagneticFieldStrength",
        "NumberOfAverages",
        "NumberOfPhaseEncodingSteps",
        "PixelBandwidth",
        "PixelRepresentation",
        "Rows",
        "SamplesPerPixel",
        "SeriesNumber",
        "SmallestImagePixelValue",
        "ActualFrameDuration",
        "AxialAcceptance",
        "DoseCalibrationFactor",
        "RescaleIntercept",
        "PrivateGroupLength",
        "NumberOfSlices",
        "ImageIndex",
        "GenericGroupLength",
        "WindowCenter",
        "WindowWidth",
        "dBdt",
    ].forEach(function(f) {
        if(h[f] === "") {
            //console.log("unsetting "+f+" of value "+h[f]);
            delete h[f];
        }
        if(h[f] === undefined) return;
        h[f] = convertToInt(h[f], f);
    });

    var float_fields = [
        "EchoTime",
        "RepetitionTime",
        "ImageOrientationPatient",
        "ImagePositionPatient",
        "ImagingFrequency",
        "PatientSize",
        "PatientWeight",
        "SAR",
        "SliceLocation",
        "SliceThickness",
        "SpacingBetweenSlices",
        "DecayFactor",
        "PixelSpacing",
        "RescaleSlope",
        "ScatterFractionFactor",
        "PercentPhaseFieldOfView",
        "PercentSampling",
    ].forEach(function(f) {
        if(h[f] === "") { 
            //console.log("unsetting "+f+" of value "+h[f]);
            delete h[f];
        }
        if(h[f] === undefined) return;
        h[f] = convertToFloat(h[f], f);
    });
}

function splitFields(h) {
    /*
    if(h.Modality != "PT") {
        h.WindowCenterWidthExplanation = convertToArray(h.WindowCenterWidthExplanation);
    }
    */
    //split WindowCenter into min/max if array
    if(h.WindowCenter && h.WindowCenter.constructor === Array) {
    //if(h.Modality == "CT") {
        h.qc_WindowCenterMin = h.WindowCenter[0];
        h.qc_WindowCenterMax = h.WindowCenter[1];
        //delete h.WindowCenter;
    }

    if(h.WindowWidth && h.WindowWidth.constructor === Array) {
        h.qc_WindowWidthMin = h.WindowWidth[0];
        h.qc_WindowWidthMax = h.WindowWidth[1];
        //delete h.WindowWidth;
    }
    
    //for PixelSpacing / ImagePositionPatient, ImageOrientationPatient fields
    //http://nipy.org/nibabel/dicom/dicom_orientation.html

    if(h.PixelSpacing && h.PixelSpacing.constructor === Array) {
        h.qc_PixelSpacingMin = h.PixelSpacing[0];
        h.qc_PixelSpacingMax = h.PixelSpacing[1];
        //delete h.PixelSpacing;
    }
}

function mergeFields(h) {
    var timestamp = toTimestamp(h.AcquisitionDate, h.AcquisitionTime, h.Timezone);
    if(timestamp) {
        h.qc_AcquisitionTimestamp = timestamp;
        //delete h.AcquisitionDate;
        //delete h.AcquisitionTime;
    }

    timestamp = toTimestamp(h.StudyDate, h.StudyTime, h.Timezone);
    if(timestamp) {
        h.qc_StudyTimestamp = timestamp;
        //delete h.StudyDate;
        //delete h.StudyTime;
    }

    timestamp = toTimestamp(h.SeriesDate, h.SeriesTime, h.Timezone);
    if(timestamp) {
        h.qc_SeriesTimestamp = timestamp;
        //delete h.SeriesDate;
        //delete h.SeriesTime;
    }

    timestamp = toTimestamp(h.ContentDate, h.ContentTime, h.Timezone);
    if(timestamp) {
        h.qc_ContentTimestamp = timestamp;
        //delete h.ContentDate;
        //delete h.ContentTime;
    }

    timestamp = toTimestamp(h.InstanceCreationDate, h.InstanceCreationTime, h.Timezone);
    if(timestamp) {
        h.qc_InstanceCreationTimestamp = timestamp;
        //delete h.InstanceCreationDate;
        //delete h.InstanceCreationTime;
    }

    timestamp = toTimestamp(h.PerformedProcedureStepStartDate, h.PerformedProcedureStepStartTime, h.Timezone);
    if(timestamp) {
        h.qc_PerformedProcedureStepStartTimestamp = timestamp;
        //delete h.PerformedProcedureStepStartDate;
        //delete h.PerformedProcedureStepStartTime;
    }
}

function parseFields(h) {
    //parse PatientAge field so that I can do numeric comparison (in year)
    /*
    PatientAge tag 0010,1010 is a 4 bytes fixed field.
    Per DICOM standard, it can have one of the following character strings:

    "[0-9][0-9][0-9]D"  Example 008D (8 days old)
    "[0-9][0-9][0-9]W"  Example 010W (10 weeks old)
    "[0-9][0-9][0-9]M"  Example 022M (22 months old)
    "[0-9][0-9][0-9]Y"  Example 091Y (91 years old)
    */
    if(h.PatientAge) {
        var num = parseInt(h.PatientAge.substr(0, 3));
        var unit = h.PatientAge.substr(3);
        switch(unit) {
        case "D": h.qc_PatientAge = num/365.25; break;
        case "W": h.qc_PatientAge = num/52.29; break;
        case "M": h.qc_PatientAge = num/12; break;
        case "Y": h.qc_PatientAge = num; break;
        default:
            console.error("unknown PatientAge unit:"+h.PatientAge); 
        }
    }
}

//convert dicom date / time format to Date()
function toTimestamp(date, time, offset) {
    if(date === undefined || time === undefined) return undefined;
    if(date === null || time === null) return null;

    if(offset === undefined) {
        offset = "+0400";
    }

    var year = date.substring(0,4);   
    var mon = date.substring(4,6);   
    var day = date.substring(6,8);   
    var h = time.substring(0,2);
    var m = time.substring(2,4);
    var s = time.substring(4,10);
    /*
    var ms = time.substring(7,13)/1000;
    var d = new Date(year, mon-1, day, h, m, s, ms);
    return d.toISOString();
    */
    var iso = year+"-"+mon+"-"+day+"T"+h+":"+m+":"+s+offset.substring(0,3)+":"+offset.substring(3,5);
    //console.dir([date, time, offset, iso]);
    return iso;
}

function convertToInt(v, f) {
    //if(v === undefined) return undefined;
    if(v === null) return null;
    if(v.constructor === Array) {
        var newa = [];
        v.forEach(function(av) {
            newa.push(convertToInt(av, f+".array"));
        });
        return newa;
    } else {
        var i = parseInt(v);
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

/*
function convertToArray(v) {
    //ImageType: 'ORIGINAL\\PRIMARY\\M\\ND\\MOSAIC',
    if(v === undefined) return undefined;
    if(v === null) return null;
    return v.split('\\');
}
*/

//parse important fields like iibisid, subject, and if record is a flag
exports.parseMeta = function(h) {
    //default
    var meta = {
        iibisid: null, 
        subject: null,
        template: false,
    };

    if(h.PatientName) {
        var ts = h.PatientName.split("^");
        meta.iibisid = ts[0];
        meta.subject = ts[1]; //subject will be undefined if there is only 1 token.
    }
    
    //this is deprecated by meta.subject
    if(h.OtherPatientIDs &&  h.OtherPatientIDs == "TEMPLATE") {
        meta.template = true;
    }

    if(meta.subject == "TEMPLATE") {
        meta.template = true;
    }

    //TODO.. it looks like Radiologist won't be able to consistently use ^ as version number separator.
    //we've discussed an alternative to strip all trailing number instead.. but I need to discuss a bit 
    //more on this again
    if(h.SeriesDescription) {
        var ts = h.SeriesDescription.split("^");
        meta.series_desc = ts[0];
        meta.series_desc_version = ts[1];
    }

    return meta;
}

//construct ES index to store
exports.composeESIndex = function(h) {
    var id = "";

    //concat various index fields (defined by Sundar / Dr. Hutchins)
    //var index_fields = [h.Modality, h.ManufacturerModelName, h.StationName, h.SoftwareVersions];
    var index_fields = ["Modality", "ManufacturerModelName", "StationName", "SoftwareVersions"];
    index_fields.forEach(function(field) {
        var value = h[field];
        if(!value) throw new Error("missing required esindex fields:"+field);
        if(id != "") id += ".";
        //make es index name friendly
        value = value.replace(/\W+/g,'_'); //replace all-non-alphanumeric chars to _
        value = value.toLowerCase();
        id += value;
    });

    return id;
}

//function to run during clean up
exports.clean = function(h) {
    convertTypes(h); //"2.34" => 2.34
    splitFields(h); 
    mergeFields(h); //date+time => timestamp
    parseFields(h); //PatientAge -> qc_PatientAge
    maskFields(h);
}

