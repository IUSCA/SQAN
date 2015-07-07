#!/usr/bin/node
var amqp = require('amqp');

var conn = amqp.createConnection({
    host: "localhost",
    login: "dicomtest",
    password: "dicomtest#pass",
    vhost: "dicom"
});

conn.on('ready', function () {
    conn.exchange('cleaned', {autoDelete: false, durable: true, type: 'topic'}, function(clean_ex) {
        conn.queue('incoming_dirty', {autoDelete: false, durable: true}, function (q) {
            q.bind('incoming', '#', function() {
                console.log("dirty queue bound to incoming");
                q.subscribe(function(h, msg_h, info, ack) {
                //q.subscribe({ack: true, prefetchCount: 1}, function(h, msg_h, info, ack) {
                    try {
                        /*
                        console.log(h.SOPInstanceUID);
                        console.log("sub: message received "+Date.now());
                        console.dir(h);
                        console.dir(info);
                        */
                        var index = composeESIndex(h);
                        console.log(h.SOPInstanceUID+" "+index);
                        h.es_index = index;

                        convertTypes(h); //"2.34" => 2.34
                        splitFields(h); 
                        mergeFields(h); //date+time => timestamp
                        clean_ex.publish('', h);
                    } catch(ex) {
                        console.log(ex, ex.stack);
                        conn.publish('cleaning_failed', h);
                        process.exit(1); //debug
                    }
                });
            });
        });
    });
});

function composeESIndex(h) {
    var id = "";

    //concat various index fields (defined by Sundar / Dr. Hutchins)
    var index_fields = [h.Modality, h.ManufacturerModelName, h.StationName, h.SoftwareVersions];
    index_fields.forEach(function(field) {
            if(id != "") id += ".";
            field = field.replace(/\W+/g,'_'); //replace all-non-alphanumeric chars to _
            field = field.toLowerCase();
            id += field;
    });

    return id;
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
        "ImageOrientationPatient",
        "LargestImagePixelValue",
        "MagneticFieldStrength",
        "NumberOfAverages",
        "NumberOfPhaseEncodingSteps",
        "PercentPhaseFieldOfView",
        "PercentSampling",
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
    if(h.WindowCenter.constructor === Array) {
    //if(h.Modality == "CT") {
        h.WindowCenterMin = h.WindowCenter[0];
        h.WindowCenterMax = h.WindowCenter[1];
        delete h.WindowCenter;
    }

    if(h.WindowWidth.constructor === Array) {
        h.WindowWidthMin = h.WindowWidth[0];
        h.WindowWidthMax = h.WindowWidth[1];
        delete h.WindowWidth;
    }
    
    if(h.PixelSpacing.constructor === Array) {
        h.PixelSpacingMin = h.PixelSpacing[0];
        h.PixelSpacingMax = h.PixelSpacing[1];
        delete h.PixelSpacing;
    }
}


function mergeFields(h) {

    var timestamp = toTimestamp(h.AcquisitionDate, h.AcquisitionTime);
    if(timestamp) {
        h.AcquisitionTimestamp = timestamp;
        delete h.AcquisitionDate;
        delete h.AcquisitionTime;
    }

    timestamp = toTimestamp(h.StudyDate, h.StudyTime);
    if(timestamp) {
        h.StudyTimestamp = timestamp;
        delete h.StudyDate;
        delete h.StudyTime;
    }

    timestamp = toTimestamp(h.SeriesDate, h.SeriesTime);
    if(timestamp) {
        h.SeriesTimestamp = timestamp;
        delete h.SeriesDate;
        delete h.SeriesTime;
    }

    timestamp = toTimestamp(h.ContentDate, h.ContentTime);
    if(timestamp) {
        h.ContentTimestamp = timestamp;
        delete h.ContentDate;
        delete h.ContentTime;
    }

    timestamp = toTimestamp(h.InstanceCreationDate, h.InstanceCreationTime);
    if(timestamp) {
        h.InstanceCreationTimestamp = timestamp;
        delete h.InstanceCreationDate;
        delete h.InstanceCreationTime;
    }

    timestamp = toTimestamp(h.PerformedProcedureStepStartDate, h.PerformedProcedureStepStartTime);
    if(timestamp) {
        h.PerformedProcedureStepStartTimestamp = timestamp;
        delete h.PerformedProcedureStepStartDate;
        delete h.PerformedProcedureStepStartTime;
    }
}

/*
exports.splitFields = splitFields;
exports.convertTypes = convertTypes;
exports.mergeFields = mergeFields;
*/
exports.clean = function(input) {
    convertTypes(input); //"2.34" => 2.34
    splitFields(input); 
    mergeFields(input); //date+time => timestamp
}
