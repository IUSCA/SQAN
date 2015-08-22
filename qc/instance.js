
exports.check = function(h, next) {
    var errors = [];
    var warnings = [];

    //[Sundar]
    //Our MRI technologists just looked into EchoTime (TE) and RepetitionTime (TR). 
    
    //For 3T specific parameters
    if(h.MagneticFieldStrength == 3){
        //Minimum of TR is 5 and maximum is 30,000. 
        if(h.RepetitionTime < 5 || h.RepetitionTime > 30000) {
            errors.push({type:"out_of_range", field:"RepetitionTime", value: h.RepetitionTime, message: "RepetitionTime should be between 5 - 30000"});
        }
        //Minimum of TE is 2 and maximum is 400.
        if(h.EchoTime < 2 || h.EchoTime > 400) {
            errors.push({type:"out_of_range", field:"EchoTime", value: h.EchoTime, message: "EchoTime should be between 5 - 30000"});
        }
    }
    
    //DEBUG mock up some random error message
    if(h.SOPInstanceUID.indexOf("004") != -1) {
        errors.push({type:"out_of_range", field:"abc", value: 123, message: "abc should be within 300 - 400"});
    }
    if(h.SOPInstanceUID.indexOf("005") != -1) {
        errors.push({type:"out_of_range", field:"def", value: 10, message: "defshould be within 100 - 200"});
    }
    if(h.SOPInstanceUID.indexOf("006") != -1) {
        errors.push({type:"missing", field:"missing_field", value: null, message: "ghj not set"});
    }

    if(h.SOPInstanceUID.indexOf("007") != -1) {
        warnings.push({type:"random warning 1", field:"abc", value: 123, message: "something is somewhat out of range"});
    }
    if(h.SOPInstanceUID.indexOf("008") != -1) {
        warnings.push({type:"random warning 2", field:"def", value: 10, message: "something is fishy here"});
    }
    if(h.SOPInstanceUID.indexOf("009") != -1) {
        warnings.push({type:"random warning 3", field:"ghj", value: null, message: "some value looks odd."});
    }

    next(errors, warnings);
}

//function to run during clean up
function maskFields(h) {
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
        if(v != null && v.indexOf("\\") !== -1) {
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
    var timestamp = toTimestamp(h.AcquisitionDate, h.AcquisitionTime);
    if(timestamp) {
        h.qc_AcquisitionTimestamp = timestamp;
        //delete h.AcquisitionDate;
        //delete h.AcquisitionTime;
    }

    timestamp = toTimestamp(h.StudyDate, h.StudyTime);
    if(timestamp) {
        h.qc_StudyTimestamp = timestamp;
        //delete h.StudyDate;
        //delete h.StudyTime;
    }

    timestamp = toTimestamp(h.SeriesDate, h.SeriesTime);
    if(timestamp) {
        h.qc_SeriesTimestamp = timestamp;
        //delete h.SeriesDate;
        //delete h.SeriesTime;
    }

    timestamp = toTimestamp(h.ContentDate, h.ContentTime);
    if(timestamp) {
        h.qc_ContentTimestamp = timestamp;
        //delete h.ContentDate;
        //delete h.ContentTime;
    }

    timestamp = toTimestamp(h.InstanceCreationDate, h.InstanceCreationTime);
    if(timestamp) {
        h.qc_InstanceCreationTimestamp = timestamp;
        //delete h.InstanceCreationDate;
        //delete h.InstanceCreationTime;
    }

    timestamp = toTimestamp(h.PerformedProcedureStepStartDate, h.PerformedProcedureStepStartTime);
    if(timestamp) {
        h.qc_PerformedProcedureStepStartTimestamp = timestamp;
        //delete h.PerformedProcedureStepStartDate;
        //delete h.PerformedProcedureStepStartTime;
    }
}


//convert dicom date / time format to Date()
function toTimestamp(date, time) {
    if(date === undefined || time === undefined) return undefined;
    if(date === null || time === null) return null;

    var year = date.substring(0,4);   
    var mon = date.substring(4,6);   
    var day = date.substring(6,8);   
    var h = time.substring(0,2);
    var m = time.substring(2,4);
    var s = time.substring(4,6);
    var ms = time.substring(7,13)/1000;
    //console.log(year, mon-1, day, h, m, s, ms);
    var d = new Date(year, mon-1, day, h, m, s, ms);
    return d.toISOString();
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
        var check = i.toString();
        if(v != i) {
            throw new Error(f+":"+v + " converted to " +i);
        }
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
        var check = i.toString();
        if(v != i) {
            throw new Error(f+":"+v + " converted to " +i);
        }
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

//function to run during clean up
exports.clean = function(h) {
    maskFields(h);
    convertTypes(h); //"2.34" => 2.34
    splitFields(h); 
    mergeFields(h); //date+time => timestamp
}

