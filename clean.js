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

                        splitFields(h); 
                        convertTypes(h); //"2.34" => 2.34
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

function convertToInt(v) {
    if(v === undefined) return undefined;
    if(v === null) return null;

    var i = parseInt(v);
    var check = i.toString();
    if(v != i) {
        throw new Error(v + " converted to " +i);
    }
    return i;
}

function convertToFloat(v) {
    if(v === undefined) return undefined;
    if(v === null) return null;

    var i = parseFloat(v);
    var check = i.toString();
    if(v != i) {
        throw new Error(v + " converted to " +i);
    }
    return i;
}

function convertToArray(v) {
    //ImageType: 'ORIGINAL\\PRIMARY\\M\\ND\\MOSAIC',
    if(v === undefined) return undefined;
    if(v === null) return null;
    return v.split('\\');
}

//convert string fields to int / float
function convertTypes(h) {
    //h.AccessionNumber: null,

    h.AcquisitionMatrix = convertToInt(h.AcquisitionMatrix); //: '80',
    h.AcquisitionNumber = convertToInt(h.AcquisitionNumber); //: '9',
    //AngioFlag: 'N',
    h.BitsAllocated = convertToInt(h.BitsAllocated);// '16',
    h.BitsStored = convertToInt(h.BitsStored); //: '12',
    //BodyPartExamined: 'BRAIN',
    //CSAImageHeaderInfo: null,
    //CSAImageHeaderType: 'IMAGE NUM 4',
    //CSAImageHeaderVersion: '20150311',
    //CSASeriesHeaderInfo: null,
    //CSASeriesHeaderType: 'MR',
    //CSASeriesHeaderVersion: '20150311',
    h.Columns = convertToInt(h.Columns); //: '560',
    //CommentsOnThePerformedProcedureStep: null,
    
    //DeviceSerialNumber: '45294',
    h.EchoNumbers = convertToInt(h.EchoNumbers); //: '1',
    h.EchoTime = convertToFloat(h.EchoTime); //: '29.0',
    h.EchoTrainLength = convertToInt(h.EchoTrainLength); //: '40',
    h.FlipAngle = convertToInt(h.FlipAngle); //: '79',
    //FrameOfReferenceUID: '1.3.12.2.1107.5.2.19.45294.1.20150311083906427.0.0.0',
    h.HighBit = convertToInt(h.HighBit); // '11',
    //ImageOrientationPatient: '1\\0\\0\\0\\1\\0',
    h.ImagePositionPatient = convertToArray(h.ImagePositionPatient); //: '-838.54721546173\\-845.81113815308\\-67.952781677246',
    h.ImageType = convertToArray(h.ImageType);
    //ImagedNucleus: '1H',
    h.ImagingFrequency = convertToFloat(h.ImagingFrequency); //: '123.25071',
    //InPlanePhaseEncodingDirection: 'COL',
    h.InstanceNumber = convertToInt(h.InstanceNumber); //: '9',
    //InstitutionAddress: 'West 16th Street 355,Indianapolis,IN,US,46206',
    //InstitutionName: 'Indiana University Medical Center',
    //InstitutionalDepartmentName: 'Department',
    h.LargestImagePixelValue = convertToInt(h.LargestImagePixelValue); // '4012',
    //MRAcquisitionType: '2D',
    h.MagneticFieldStrength = convertToInt(h.MagneticFieldStrength); //: '3',
    //Manufacturer: 'SIEMENS',
    //ManufacturerModelName: 'Skyra',
    //Modality: 'MR',
    h.NumberOfAverages = convertToInt(h.NumberOfAverages); //: '1',
    h.NumberOfPhaseEncodingSteps = convertToInt(h.NumberOfPhaseEncodingSteps); //: '80',
    //OperatorsName: 'MAB',
    //PatientAge: '001D',
    //PatientBirthDate: '20150311',
    //PatientID: '2015MAR11',
    //PatientName: 'STABILITY FMRI^RESEARCH SKYRA GH',
    //PatientPosition: 'HFS',
    //PatientSex: 'O',
    h.PatientSize = convertToFloat(h.PatientSize); //: '1.82880366',
    h.PatientWeight = convertToFloat(h.PatientWeight); //: '90.71848554',
    h.PercentPhaseFieldOfView = convertToInt(h.PercentPhaseFieldOfView); //: '100',
    h.PercentSampling = convertToInt(h.PercentSampling); //: '100',
    //PerformedProcedureStepDescription: 'QA^fMRI QA',
    //PerformedProcedureStepID: 'MR20150311083906',
    //PerformingPhysicianName: null,
    //PhotometricInterpretation: 'MONOCHROME2',
    h.PixelBandwidth = convertToInt(h.PixelBandwidth); //: '2155',
    //PixelData: null,
    h.PixelRepresentation = convertToInt(h.PixelRepresentation); //: '0',
    var minmax = convertToArray(h.PixelSpacing);
    if(minmax) {
        h.PixelSpacingMin = convertToFloat(minmax[0]);
        h.PixelSpacingMax = convertToFloat(minmax[1]);
        delete h.PixelSpacing;
    }
    //PositionReferenceIndicator: null,
    //PrivateCreator: 'SIEMENS MR HEADER',
    //ProtocolName: 'EPI Stability 200 meas 2',
    /*
    ReferencedImageSequence:
    [ { ReferencedSOPClassUID: '1.2.840.10008.5.1.4.1.1.4',
       ReferencedSOPInstanceUID: '1.3.12.2.1107.5.2.19.45294.2015031109010849562319238' },
     { ReferencedSOPClassUID: '1.2.840.10008.5.1.4.1.1.4',
       ReferencedSOPInstanceUID: '1.3.12.2.1107.5.2.19.45294.2015031109011173354319246' },
     { ReferencedSOPClassUID: '1.2.840.10008.5.1.4.1.1.4',
       ReferencedSOPInstanceUID: '1.3.12.2.1107.5.2.19.45294.2015031109011012454719242' } ],
    */
    //ReferringPhysicianName: null,
    //RepetitionTime: '2250',
    //RequestedProcedureDescription: 'QA fMRI QA',
    h.Rows = convertToInt(h.Rows); //: '560',
    h.SAR = convertToFloat(h.SAR); //: '0.19289907302839',
    //SOPClassUID: '1.2.840.10008.5.1.4.1.1.4',
    //SOPInstanceUID: '1.3.12.2.1107.5.2.19.45294.2015031109102426647444432',
    h.SamplesPerPixel = convertToInt(h.SamplesPerPixel); //: '1',
    //ScanOptions: 'FS',
    //ScanningSequence: 'EP',
    //SequenceName: '*epfid2d1_80',
    //SequenceVariant: 'SK',
    //SeriesDescription: 'EPI Stability 200 meas 2',
    //SeriesInstanceUID: '1.3.12.2.1107.5.2.19.45294.2015031109095552936143360.0.0.0',
    h.SeriesType = convertToArray(h.SeriesType);
    h.SeriesNumber = convertToInt(h.SeriesNumber); //: '3',
    //SeriesWorkflowStatus: 'com',
    h.SliceLocation = convertToFloat(h.SliceLocation); //'-67.952781677246'
    h.SliceThickness = convertToFloat(h.SliceThickness); //: '3.5',
    h.SmallestImagePixelValue = convertToInt(h.SmallestImagePixelValue); //'0');
    //SoftwareVersions: 'syngo MR D13',
    /*
    SourceImageSequence:
    [ { ReferencedSOPClassUID: '1.2.840.10008.5.1.4.1.1.4',
       ReferencedSOPInstanceUID: '1.3.12.2.1107.5.2.19.45294.201503110910227302544316' },
     { ReferencedSOPClassUID: '1.2.840.10008.5.1.4.1.1.4',
       ReferencedSOPInstanceUID: '1.3.12.2.1107.5.2.19.45294.2015031109102212533144320' },
     { ReferencedSOPClassUID: '1.2.840.10008.5.1.4.1.1.4',
       ReferencedSOPInstanceUID: '1.3.12.2.1107.5.2.19.45294.2015031109102218461144323' },
     { ReferencedSOPClassUID: '1.2.840.10008.5.1.4.1.1.4',
       ReferencedSOPInstanceUID: '1.3.12.2.1107.5.2.19.45294.2015031109102224357544326' },
     { ReferencedSOPClassUID: '1.2.840.10008.5.1.4.1.1.4',
       ReferencedSOPInstanceUID: '1.3.12.2.1107.5.2.19.45294.2015031109102228158844329' },
     { ReferencedSOPClassUID: '1.2.840.10008.5.1.4.1.1.4',
       ReferencedSOPInstanceUID: '1.3.12.2.1107.5.2.19.45294.2015031109102235569744332' },
     { ReferencedSOPClassUID: '1.2.840.10008.5.1.4.1.1.4',
       ReferencedSOPInstanceUID: '1.3.12.2.1107.5.2.19.45294.2015031109102241472844335' },
     { ReferencedSOPClassUID: '1.2.840.10008.5.1.4.1.1.4',
       ReferencedSOPInstanceUID: '1.3.12.2.1107.5.2.19.45294.2015031109102245274144338' },
     { ReferencedSOPClassUID: '1.2.840.10008.5.1.4.1.1.4',
       ReferencedSOPInstanceUID: '1.3.12.2.1107.5.2.19.45294.2015031109102252660544341' },
     { ReferencedSOPClassUID: '1.2.840.10008.5.1.4.1.1.4',
       ReferencedSOPInstanceUID: '1.3.12.2.1107.5.2.19.45294.2015031109102258605944344' },
     { ReferencedSOPClassUID: '1.2.840.10008.5.1.4.1.1.4',
       ReferencedSOPInstanceUID: '1.3.12.2.1107.5.2.19.45294.2015031109102262362144347' },
     { ReferencedSOPClassUID: '1.2.840.10008.5.1.4.1.1.4',
       ReferencedSOPInstanceUID: '1.3.12.2.1107.5.2.19.45294.2015031109102269795344350' },
     { ReferencedSOPClassUID: '1.2.840.10008.5.1.4.1.1.4',
       ReferencedSOPInstanceUID: '1.3.12.2.1107.5.2.19.45294.2015031109102275686744353' },
     { ReferencedSOPClassUID: '1.2.840.10008.5.1.4.1.1.4',
       ReferencedSOPInstanceUID: '1.3.12.2.1107.5.2.19.45294.2015031109102277514344356' },
     { ReferencedSOPClassUID: '1.2.840.10008.5.1.4.1.1.4',
       ReferencedSOPInstanceUID: '1.3.12.2.1107.5.2.19.45294.2015031109102286860344359' },
     { ReferencedSOPClassUID: '1.2.840.10008.5.1.4.1.1.4',
       ReferencedSOPInstanceUID: '1.3.12.2.1107.5.2.19.45294.2015031109102292840544362' },
     { ReferencedSOPClassUID: '1.2.840.10008.5.1.4.1.1.4',
       ReferencedSOPInstanceUID: '1.3.12.2.1107.5.2.19.45294.2015031109102298787544365' },
     { ReferencedSOPClassUID: '1.2.840.10008.5.1.4.1.1.4',
       ReferencedSOPInstanceUID: '1.3.12.2.1107.5.2.19.45294.201503110910234018944368' },
     { ReferencedSOPClassUID: '1.2.840.10008.5.1.4.1.1.4',
       ReferencedSOPInstanceUID: '1.3.12.2.1107.5.2.19.45294.201503110910239906144371' },
     { ReferencedSOPClassUID: '1.2.840.10008.5.1.4.1.1.4',
       ReferencedSOPInstanceUID: '1.3.12.2.1107.5.2.19.45294.2015031109102315873044374' },
     { ReferencedSOPClassUID: '1.2.840.10008.5.1.4.1.1.4',
       ReferencedSOPInstanceUID: '1.3.12.2.1107.5.2.19.45294.2015031109102319653744377' },
     { ReferencedSOPClassUID: '1.2.840.10008.5.1.4.1.1.4',
       ReferencedSOPInstanceUID: '1.3.12.2.1107.5.2.19.45294.2015031109102327016944380' },
     { ReferencedSOPClassUID: '1.2.840.10008.5.1.4.1.1.4',
       ReferencedSOPInstanceUID: '1.3.12.2.1107.5.2.19.45294.2015031109102332987644383' },
     { ReferencedSOPClassUID: '1.2.840.10008.5.1.4.1.1.4',
       ReferencedSOPInstanceUID: '1.3.12.2.1107.5.2.19.45294.2015031109102336756444386' },
     { ReferencedSOPClassUID: '1.2.840.10008.5.1.4.1.1.4',
       ReferencedSOPInstanceUID: '1.3.12.2.1107.5.2.19.45294.2015031109102344098844389' },
     { ReferencedSOPClassUID: '1.2.840.10008.5.1.4.1.1.4',
       ReferencedSOPInstanceUID: '1.3.12.2.1107.5.2.19.45294.2015031109102350063444392' },
     { ReferencedSOPClassUID: '1.2.840.10008.5.1.4.1.1.4',
       ReferencedSOPInstanceUID: '1.3.12.2.1107.5.2.19.45294.2015031109102353855444395' },
     { ReferencedSOPClassUID: '1.2.840.10008.5.1.4.1.1.4',
       ReferencedSOPInstanceUID: '1.3.12.2.1107.5.2.19.45294.2015031109102361249044398' },
     { ReferencedSOPClassUID: '1.2.840.10008.5.1.4.1.1.4',
       ReferencedSOPInstanceUID: '1.3.12.2.1107.5.2.19.45294.2015031109102367140544401' },
     { ReferencedSOPClassUID: '1.2.840.10008.5.1.4.1.1.4',
       ReferencedSOPInstanceUID: '1.3.12.2.1107.5.2.19.45294.2015031109102368995044404' },
     { ReferencedSOPClassUID: '1.2.840.10008.5.1.4.1.1.4',
       ReferencedSOPInstanceUID: '1.3.12.2.1107.5.2.19.45294.2015031109102378288244407' },
     { ReferencedSOPClassUID: '1.2.840.10008.5.1.4.1.1.4',
       ReferencedSOPInstanceUID: '1.3.12.2.1107.5.2.19.45294.2015031109102384277844410' },
     { ReferencedSOPClassUID: '1.2.840.10008.5.1.4.1.1.4',
       ReferencedSOPInstanceUID: '1.3.12.2.1107.5.2.19.45294.2015031109102390187944413' },
     { ReferencedSOPClassUID: '1.2.840.10008.5.1.4.1.1.4',
       ReferencedSOPInstanceUID: '1.3.12.2.1107.5.2.19.45294.2015031109102395403744416' },
     { ReferencedSOPClassUID: '1.2.840.10008.5.1.4.1.1.4',
       ReferencedSOPInstanceUID: '1.3.12.2.1107.5.2.19.45294.201503110910241387044419' },
     { ReferencedSOPClassUID: '1.2.840.10008.5.1.4.1.1.4',
       ReferencedSOPInstanceUID: '1.3.12.2.1107.5.2.19.45294.201503110910247322744422' },
     { ReferencedSOPClassUID: '1.2.840.10008.5.1.4.1.1.4',
       ReferencedSOPInstanceUID: '1.3.12.2.1107.5.2.19.45294.2015031109102411117344425' },
     { ReferencedSOPClassUID: '1.2.840.10008.5.1.4.1.1.4',
       ReferencedSOPInstanceUID: '1.3.12.2.1107.5.2.19.45294.2015031109102418511544428' },
     { ReferencedSOPClassUID: '1.2.840.10008.5.1.4.1.1.4',
       ReferencedSOPInstanceUID: '1.3.12.2.1107.5.2.19.45294.2015031109102426460644431' } ],
    */
    h.SpacingBetweenSlices = convertToFloat(h.SpacingBetweenSlices); //: '3.5',
    //SpecificCharacterSet: 'ISO_IR 100',
    //StationName: 'AWP45294',
    //StudyDescription: 'QA^fMRI QA',
    //StudyID: '1',
    //StudyInstanceUID: '1.3.12.2.1107.5.2.19.45294.30000015031112005561200000004',
    //TransmitCoilName: 'Body',
    //'Unknown Tag & Data': 'A1/FS',
    //VariableFlipAngleFlag: 'N',

    switch(h.Modality) {
    case "MR":
        h.WindowCenter = convertToInt(h.WindowCenter); //: '757',
        h.WindowWidth = convertToInt(h.WindowWidth); //: '2602',
        break;
    case "CT":
    case "PT":
        h.WindowCenterMin = convertToInt(h.WindowCenterMin);
        h.WindowCenterMax = convertToInt(h.WindowCenterMax);
        h.WindowWidthMin = convertToInt(h.WindowWidthMin);
        h.WindowWidthMax = convertToInt(h.WindowWidthMax);
        break;
    }
    //WindowCenterWidthExplanation: 'Algo1',
    h.dBdt = convertToInt(h.dBdt); // '0' 
}

function splitFields(h) {
    if(h.Modality != "PT") {
        h.WindowCenterWidthExplanation = convertToArray(h.WindowCenterWidthExplanation);
    }
    if(h.Modality != "MR") {
        var minmax = convertToArray(h.WindowCenter);
        if(minmax) {
            h.WindowCenterMin = minmax[0];
            h.WindowCenterMax = minmax[1];
            delete h.WindowCenter;
        }

        var minmax = convertToArray(h.WindowWidth);
        if(minmax) {
            h.WindowWidthMin = minmax[0];
            h.WindowWidthMax = minmax[1];
            delete h.WindowWidth;
        }
    }
}


function mergeFields(h) {

    h.AcquisitionTimestamp = toTimestamp(h.AcquisitionDate, h.AcquisitionTime);
    delete h.AcquisitionDate;
    delete h.AcquisitionTime;

    h.StudyTimestamp = toTimestamp(h.StudyDate, h.StudyTime);
    delete h.StudyDate;
    delete h.StudyTime;

    h.SeriesTimestamp = toTimestamp(h.SeriesDate, h.SeriesTime);
    delete h.SeriesDate;
    delete h.SeriesTime;

    h.ContentTimestamp = toTimestamp(h.ContentDate, h.ContentTime);
    delete h.ContentDate;
    delete h.ContentTime;

    h.InstanceCreationTimestamp = toTimestamp(h.InstanceCreationDate, h.InstanceCreationTime);
    delete h.InstanceCreationDate;
    delete h.InstanceCreationTime;

    h.PerformedProcedureStepStartTimestamp = toTimestamp(h.PerformedProcedureStepStartDate, h.PerformedProcedureStepStartTime);
    delete h.PerformedProcedureStepStartDate;
    delete h.PerformedProcedureStepStartTime;
}


