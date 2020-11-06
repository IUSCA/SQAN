'use strict';

const fs = require('fs');
const os = require('os');
const winston = require('winston');

//const shostname = os.hostname().split('.')[0]; //grab first hostname

exports.dicom = {
    //profile_api: 'http://localhost:12402',

    //jwt needed to access profile service
    //use auth/bin/signjwt.js to create the token
    //profile_jwt: fs.readFileSync(__dirname+'/profile.jwt'),

    auth_api: 'http://localhost:22000',
    auth_jwt: fs.readFileSync(__dirname+'/auth.jwt'),
}

// exports.events = {
//     //warning.. you don't get error message if your user/pass etc. are incorrect (it just keeps retrying silently..)
//     amqp: {url: "amqp://dicom:dicompass123@localhost:5672/sca"},
//     exchange: "dicom", //used as prefix for full exchange name
// }

exports.auth = {
    //default user object when registered
    default: {
        //scopes can be empty.. but don't remove it! (a lot of app expects scopes object to exist)
        scopes: {
            sca: ["user"],
            dicom: ["user"],
        },
        gids: [ 1 ],
    },

    //isser to use for generated jwt token
    iss: "https://rady-test.sca.iu.edu",
    //ttl for jwt
    ttl: 24*3600*1000, //1 day

    //TODO - fix this
    secret: 'changemetoo',

    //Whitelist for API/admin access
    whitelist: ['youngmd','agopu','aiavenak'],
    advanced: [],
    whitelist_ip: ['127.0.0.1', '149.163.170.45'],
    //allow_signup: false, //prevent user from signing in (set false if not using local auth)
};

exports.contact = {
    email : 'youngmd@iu.edu',
    subject : 'RADY-SCA (test) Contact Form',
    bcc: 'youngmd@indiana.edu,agopu@iu.edu,aiavenak@iu.edu',
    // bcc: 'youngmd@indiana.edu',
    footer: "\n\n############################################\nThis message was submitted via the RADY-SCA contact form (dev)\n"
};

exports.qc = {
    //number of images to QC on each batch
    batch_size: 5000,
    tarball_age: 30,
    series_batch_size: 10
}

exports.acl = {
    key : 'iibisid',
    default_groups : ["5d1638deda06df0aa034cd46", "5d1638deda06df0aa034cd49"],
    actions : ['qc','view']
}

/*
exports.notification = {
    amqp: {
        //url: "amqp://dss:dsspass@soichi7:5672/odi"
        host: "localhost",
        login: "dicom",
        password: "dicom#forme",
        vhost: "sca"
    },
    ex: "notification",
}
*/

/*
//this should eventually move to DB
exports.acl = {
    //iibisids [ ids (not username) ]
    "0000-00001": [ 3, 8, 9, 10 ],
    "2008-00050": [ 3, 8, 9, 10 ],
    "2013-00030": [ 3, 8, 9, 10 ],
}
*/

exports.express = {
    port: 22340,
    jwt: {
        pub: fs.readFileSync(__dirname+'/auth.pub'),
        key: fs.readFileSync(__dirname+'/auth.key')
    },
    //option for jwt.sign
    sign_opt: {algorithm: 'RS256'},
}

exports.incoming = {
    amqp: {
        //url: "amqp://dss:dsspass@soichi7:5672/odi"
        host: "localhost", //firewall doesn't seem to be setup properly.."sca.iu.edu",
        login: "rady",
        password: "rady#4every1",
        vhost: "rady"
    },

    //exchange to publish incoming data
    ex: "incoming",
    q: "incoming_dirty",
    //q: "test_incoming_dirty",
}

//mainly for orthanc2incomingQ.js
exports.orthanc = {

    //location to store where the last ortanc insance sequence processed
    //last_seq: "/tmp/orthans2disk_lastseq.txt",

    //orthanc rest api endpoing (with user/pass)
    //url: "https://sca:scadev@localhost/orthanc",
    url: "http://username:changme@172.18.0.2:8042",

    //directory to store qc templates
    //TODO:  are we using this anywhere??  this directory doesn't exist
    //qc_templates: "/usr/local/qc-templates",

    //where the analysis.json and raw headers are stored
    //analyzed_headers: "/usr/local/analyzed-dicom-headers"
}

exports.cleaner = {
    // amqp: {
    //     //url: "amqp://dss:dsspass@soichi7:5672/odi"
    //     host: "localhost", //firewall doesn't seem to be setup properly.."sca.iu.edu",
    //     login: "rady",
    //     password: "rady#4every1",
    //     vhost: "rady"
    // },
    // //exchange to publish incoming data (used by orthanc2incomingQ.js)
    // ex: "cleaned",
    //
    // //for es
    // es_q: "cleaned_for_es",

    //location to store all raw incoming headers from orthanc (creates sub directories using SeriesDate)
    raw_headers: "/opt/test/dicom-raw",
    // location to store tarball files of deleted, overwritten, deprecated data
    deleted_headers: "/opt/test/dicom-deleted",
    //queue / directory to store failed headers
    failed_q: "cleaning_failed",
    //location to store all raw incoming headers that failed to clean
    failed_headers: "/opt/test/cleanfailed-dicom-headers",

    //locations to store cleaned instances / templates
    //cleaned_images: "/usr/local/cleaned-dicom-images",
    //cleaned_templates: "/usr/local/cleaned-dicom-templates",
    //cleaned: "/opt/sca/dicom-clean",
}

exports.mongodb = {
    url: "mongodb://localhost:27027/rady",
    params: {
        useMongoClient: true,
        // replicaSet: 'replSet1'
    }
};

// exports.mongodb = "mongodb://localhost:27027/rady";

exports.logger = {
    winston: {
        transports: [
            //display all logs to console
            new winston.transports.Console({
                timestamp: function() {
                    var d = new Date();
                    return d.toString();
                },
                level: 'debug',
                colorize: true
            }),

            //store all warnings / errors in error.log
            new (winston.transports.File)({
                filename: '/opt/test/var/log/rady.err',
                level: 'warn'
            })
        ]
    }
}


