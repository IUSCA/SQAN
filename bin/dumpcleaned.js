#!/usr/bin/node
var amqp = require('amqp');
var fs = require('fs');
var config = require('../config/config').config;

var conn = amqp.createConnection(config.amqp);
//var dicom_header_path = "/usr/local/dicom-headers";
//var runtime = Date.now()/1000;

var count = 0;

Date.prototype.yyyymmdd = function() {
    var yyyy = this.getFullYear().toString();
    var mm = (this.getMonth()+1).toString(); // getMonth() is zero-based
    var dd  = this.getDate().toString();
    return yyyy + (mm[1]?mm:"0"+mm[0]) + (dd[1]?dd:"0"+dd[0]); // padding
};

//dump all new headers to disk
conn.on('ready', function () {
    conn.queue('cleaned_for_qc', {autoDelete: false, durable: true}, function (q) {
        //console.log("cleaned_for_qc bound to incoming");
        q.subscribe({ack: true}, function(h, msg_h, info) {
            try {
                /*
                //DEBUG
                //fake ids to force things to group
                h.PatientID = "fake.patient_id";
                h.StudyInstanceUID = "fake.studyid";
                h.SeriesInstanceUID = "fake.seriesid";
                */

                //PatientID seems to be bday of the patient?
                //var patient_id = h.PatientID.replace(/\//g, "_");

                var study_id = h.StudyInstanceUID;
                var series_id = h.SeriesInstanceUID;
                var inst_id = h.SOPInstanceUID;
                //var series_desc = h.SeriesDescription;;
                //var patient_name = h.PatientName;
                //var study_desc = h.StudyDescription;

                /*
                //let group by the date of study timestamp (TODO - should I use other timestamps?)
                var study_time = new Date(h.qc_StudyTimestamp);
                var path = config.incoming_headers+"/"+study_time.yyyymmdd();

                //make sure directory exists
                if(!fs.existsSync(path)) {
                    fs.mkdirSync(path);
                }
                */

                path = config.cleaned_headers+"/"+study_id;
                console.log(path);
                if(!fs.existsSync(path)) {
                    fs.mkdirSync(path);
                }
                path += "/"+series_id;
                console.log(path);
                if(!fs.existsSync(path)) {
                    fs.mkdirSync(path);
                }

                console.log(path+"/"+inst_id);
                fs.writeFileSync(path+"/"+inst_id, JSON.stringify(h, null, 4));

                /*
                if(!root[patient_id]) {
                    root[patient_id] = {};
                } 
                if(!root[patient_id][study_id]) {
                    root[patient_id][study_id] = {};
                } 
                if(!root[patient_id][study_id][series_id]) {
                    root[patient_id][study_id][series_id] = {};
                } 
                */

                //root[patient_id][study_id][series_id][inst_id] = h;

                count++;
                q.shift();
            } catch(ex) {
                console.log("failed to store header");
                console.log(ex, ex.stack);
                //DEBUG
                //process.exit(1);
            }
        }); //subscribe
    }); //queue
}); //ready

/*
var prev_count = count;
setInterval(function() {
    var dcount = count - prev_count;
    prev_count = count;

    if(dcount < 200) {
        console.log("haven't received any records for the last 10 seconds.. calling it done");
        process.exit(0);
    }
}, 1000*10);
*/
