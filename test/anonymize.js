#!/usr/bin/node
var mongoose = require('mongoose');
var fs = require('fs');
var config = require('../config');
var db = require('../api/models');
var async = require('async');
var faker = require('faker');

let research_total = {}

let fake_studies = JSON.parse(fs.readFileSync('/opt/test/rady-qc/test/fake_studies.json')).studies;

//https://stackoverflow.com/questions/6248666/how-to-generate-short-uid-like-ax4j9z-in-js
function generateUID(iibis) {
    // I generate the UID from two parts here
    // to ensure the random number provide enough bits.
    var secondPart = (Math.random() * 46656) | 0;
    secondPart = ("000" + secondPart.toString(36)).slice(-3);
    return iibis.split('-')[0] +'-0'+ secondPart.toUpperCase();
}

function yyyymmdd(x) {
    var y = x.getFullYear().toString();
    var m = (x.getMonth() + 1).toString();
    var d = x.getDate().toString();
    (d.length == 1) && (d = '0' + d);
    (m.length == 1) && (m = '0' + m);
    var yyyymmdd = y + m + d;
    return yyyymmdd;
}

function update_keyword(header, key, val) {
    if(key in header) {
        header[key] = val;
    }
    return header;
}

function update_header(header, new_iibis, new_date, new_subj, cb) {
    // "ContentDate" : "20180815",
    // "AcquisitionDate" : "20180815",
    // "SeriesDate" : "20180815",
    // "StudyDate" : "20180815",
    // "CSASeriesHeaderVersion" : "20180815",
    // "CSAImageHeaderVersion" : "20180815",
    // "qc_subject" : "10815",
    // "qc_StudyTimestamp" : "2018-08-15T09:48:37.346-04:00",
    // "qc_iibisid" : "0000-00001",
    // "PatientName" : "0000-00001^10815",
    let dt_s = yyyymmdd(new_date);

    var dt_s_keys = ['ContentDate','AcquisitionDate','SeriesDate','StudyDate','CSASeriesHeaderVersion','CSAImageHeaderVersion'];

    for(let dsk of dt_s_keys) {
        header = update_keyword(header, dsk, dt_s);
    }

    header = update_keyword(header, 'qc_subject', new_subj);
    header = update_keyword(header, 'qc_StudyTimestamp', new_date);
    header = update_keyword(header, 'qc_iibisid', new_iibis);
    header = update_keyword(header, 'PatientName', new_iibis+'^'+new_subj);

    header = update_keyword(header, "PatientSex", Math.round(Math.random()) ? "M" : "F");

    let new_age = '0'+Math.round(Math.random() * 80 + 10)+'Y'
    header = update_keyword(header, "PatientAge", new_age );
    header = update_keyword(header, "qc_PatientAge", new_age);
    header = update_keyword(header, "PatientWeight", Math.random() * 100 + 40);
    header = update_keyword(header, "PatientSize", Math.random() * 1.2 + 1);
    return cb(header);
}

db.init(function(err) {
    if(err) throw err; //will crash

    db.Research.find({}, function(err, researches){
        if(err) console.log(err);
        async.each(researches, function(research, cb_r){

            console.log("Working on research "+research.IIBISID)

            let old_iibis = research.IIBISID;
            let new_iibis = generateUID(research.IIBISID);
            console.log(`New ID is ${new_iibis}`);

            db.Acl.findOne({IIBISID: research.IIBISID}, function(err, acl) {
                if(!acl) return;
                acl.IIBISID = new_iibis;
                console.log(`Updated IIBIS in ACL to ${new_iibis}`);
                acl.markModified('IIBISID');
                acl.save();
            });

            db.IIBIS.findOne({iibis_project_id: research.IIBISID}, {lean: true}, function(err, iibis) {
                if(!iibis) return;
                console.log(`Old Title: ${iibis.short_title}`);
                let new_title = fake_studies.pop();
                console.log(`New Title: ${new_title}`);
                let first_name = faker.name.firstName() // Returned: Joe
                let last_name = faker.name.lastName() // Returned: Smith
                const pi_user = {
                    first_name, // Set First Name: Joe
                    last_name, // Set Last Name: Smith
                    email_address: faker.internet.email(
                        first_name, // Pass in: Joe
                        last_name, // Pass in Smith
                        faker.random.arrayElement(['iu.edu', 'iupui.edu','indiana.edu']) // Let Faker.js choose
                    ),
                }
                console.log(`New PI:  ${pi_user.first_name} ${pi_user.last_name}, ${pi_user.email_address}`);

                let cfirst_name = faker.name.firstName() // Returned: Joe
                let clast_name = faker.name.lastName() // Returned: Smith
                const co_user = {
                    cfirst_name, // Set First Name: Joe
                    clast_name, // Set Last Name: Smith
                    email_address: faker.internet.email(
                        cfirst_name, // Pass in: Joe
                        clast_name, // Pass in Smith
                        faker.random.arrayElement(['iu.edu', 'iupui.edu','indiana.edu']) // Let Faker.js choose
                    ),
                }

                iibis.iibis_project_id = new_iibis;
                iibis.short_title = new_title;
                iibis.full_title = new_title;
                iibis.pi_last_name = pi_user.last_name;
                iibis.pi_first_name = pi_user.first_name;
                iibis.email_address = pi_user.email_address;
                iibis.project_coordinator_or_contact = co_user.first_name + ' ' + co_user.last_name;
                iibis.coordinator_email = co_user.email_address;
                iibis.project_status = "Anonymized";

                db.IIBIS.findOneAndUpdate({_id: iibis._id}, iibis, {strict: false}, function(err, _iibis) {
                    if(err) cb_r(err);
                    console.log(`updated IIBIS from ${old_iibis} to ${new_iibis}`);
                })

                console.log(`New Coordinator:  ${co_user.cfirst_name} ${co_user.clast_name}, ${co_user.email_address}`);
            });

            db.Exam.find({research_id:research._id, istemplate:false},function(err,exams){
                if(err) console.log(err);
                if (exams.length == 0) {
                    cb_r();
                    return;
                }
                async.each(exams, function(te, cb_e) {

                    let new_date = te.StudyTimestamp;
                    let new_subj = "10" + Math.floor(1000 + Math.random() * 9000);
                    new_date.setDate(new_date.getDate() - Math.round(Math.random() * 30));
                    te.StudyTimestamp = new_date;
                    te.subject = new_subj;
                    te.markModified("StudyTimestamp");
                    te.markModified("subject");
                    te.save();
                    db.Series.find({exam_id:te._id},function(err,series){
                        if (series.length == 0) {
                            cb_e();
                            return;
                        }
                        async.each(series, function(t, cb_s) {
                            db.Image.findOne({series_id: t._id, primary_image: null}, function (err, p_image) {
                                if (err) cb_s(err)
                                if (!p_image) {
                                    cb_s();
                                }

                                update_header(p_image.headers, new_iibis, new_date, new_subj, function(_header) {
                                    p_image.headers = _header;
                                    p_image.markModified("headers");
                                    p_image.save();
                                    cb_s();
                                })
                            })
                        }, function(err) {
                            if (err) cb_e(err)

                            cb_e();
                        });
                    })
                }, function(err) {
                    if (err) cb_r(err)
                    console.log('Done with research '+research.IIBISID)
                    research.IIBISID = new_iibis;
                    research.markModified("IIBISID");
                    research.save();
                    cb_r();
                });
            })
        }, function(err) {
            if (err) console.log(err)
            console.log("All done!");
        });
    })
})

    //
    // "ContentDate" : "20180815",
    // "AcquisitionDate" : "20180815",
    // "SeriesDate" : "20180815",
    // "StudyDate" : "20180815",
    // "CSASeriesHeaderVersion" : "20180815",
    // "CSAImageHeaderVersion" : "20180815",
    // "qc_subject" : "10815",
    // "qc_PatientAge" : 79,
    // "qc_StudyTimestamp" : "2018-08-15T09:48:37.346-04:00",
    // "qc_iibisid" : "0000-00001",
    // "PatientWeight" : 64.4101247334,
    // "PatientSize" : 1.5494031008333,
    // "PatientAge" : "079Y",
    // "PatientSex" : "F",
    // "PatientBirthDate" : "",
    // "PatientName" : "0000-00001^10815",
    //
    //
    // select research
    // update acls
    // update iibis collection?
    // update exams (change timestamp)
    // update image headers for each series in each exam

