'use strict';

const fs = require('fs');
const os = require('os');
const winston = require('winston');


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
    iss: "https://my.sqan.site",
    //ttl for jwt
    ttl: 24*3600*1000, //1 day

    secret: 'changemetoo',

    //Whitelist for API/admin access
    whitelist: ['admin'],
    advanced: [],
    whitelist_ip: ['127.0.0.1'],
};

exports.contact = {
    email : 'changme@SQANINSTANCE.ORG',
    subject : 'SQAN Contact Form',
    bcc: 'comma.separated@email.addresses',
    footer: "\n\n############################################\nThis message was submitted via the SQAN contact form\n"
};

exports.qc = {
    //number of images to QC on each batch
    batch_size: 5000,
    tarball_age: 30,
    series_batch_size: 10
}

exports.acl = {
    key : 'iibisid',
    default_groups : ["id_of_default_group1", "id_of_default_group2"],
    actions : ['qc','view']
}

exports.express = {
    port: 22340,
    jwt: {
        pub: fs.readFileSync(__dirname+'/auth.pub'),
        key: fs.readFileSync(__dirname+'/auth.key')
    },
    //option for jwt.sign
    sign_opt: {algorithm: 'RS256'},
}


exports.orthanc = {

    //orthanc rest api endpoing (with user/pass)
    url: "http://orthancuser:orthancpass@my.orthanc.instance:8045",

}

exports.cleaner = {
    //location to store all raw incoming headers from orthanc (creates sub directories using SeriesDate)
    raw_headers: "/opt/sqan_dicom/dicom-raw",
    // location to store tarball files of deleted, overwritten, deprecated data
    deleted_headers: "/opt/sqan_dicom/dicom-deleted",
    //location to store all raw incoming headers that failed to clean
    failed_headers: "/opt/sqan_dicom/cleanfailed-dicom-headers",

}

exports.mongodb = {
    url: "mongodb://mongo_user:mongo_password@mongohost:27017/sqan",
    params: {
        useMongoClient: true,
        // replicaSet: 'replSet1'
    }
};

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
                filename: '/opt/sqan_logs/sqan.err',
                level: 'warn'
            })
        ]
    }
}


