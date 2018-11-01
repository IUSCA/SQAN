#!/usr/bin/node

//node
var fs = require('fs');
var tar = require('tar');

//contrib
var amqp = require('amqp');
var winston = require('winston');
var async = require('async');
var mkdirp = require('mkdirp');

//mine
var config = require('../config');
var logger = new winston.Logger(config.logger.winston);
var db = require('../api/models');
var qc = require('../api/qc');

//to-be-initizalied
var conn = null;
var cleaned_ex = null;
var cleaned_q = null;
var failed_q = null;
var incoming_q = null;

//connect to AMQP, ensure exchange / queues exists, and subscribe to the incoming q
db.init(function(err) {
    if(err) throw err; //will crash
    conn = amqp.createConnection(config.cleaner.amqp);
    conn.on('ready', function () {
        logger.info("connected to amqp - connecting to ex:"+config.cleaner.ex);
        conn.exchange(config.cleaner.ex, {confirm: true, autoDelete: false, durable: true, type: 'topic'}, function(_cleaned_ex) {
            cleaned_ex = _cleaned_ex;
            logger.info("connecting to failed_q:"+config.cleaner.failed_q);
            conn.queue(config.cleaner.failed_q, {autoDelete: false, durable: true}, function(_failed_q) {
                failed_q = _failed_q;
                logger.info("connecting to es_q:"+config.cleaner.es_q);
                conn.queue(config.cleaner.es_q, {autoDelete: false, durable: true}, function(_cleaned_q) {
                    cleaned_q = _cleaned_q;
                    logger.info("binding es_q to ex:"+config.cleaner.ex);
                    cleaned_q.bind(config.cleaner.ex, '#', function() {
                        logger.info("connecting to incoming q:"+config.incoming.q);
                        conn.queue(config.incoming.q, {autoDelete: false, durable: true}, function (_incoming_q) {
                            incoming_q = _incoming_q;
                            logger.info("finally, subscribing to incoming q");
                            incoming_q.subscribe({ack: true, prefetchCount: 1}, incoming);
                        });
                    });
                });
            });
        });
    });
});

//here is the main business logic
function incoming(h, msg_h, info, ack) {
    var research = null;
    var exam = null;
    var series = null;
    var template = null;
    var aq = null;

    async.series([
        function(next) {
            try {
                // AAK -- this should be removed once we are ready to deploy
                //debug - remove qc_ fields... it shouldn't be there, but there are.. maybe I've corrupted the data?
                for(var k in h) {
                    if(k.indexOf("qc_") === 0) delete h[k];
                }
                
                //parse some special fields
                //if these fields fails to set, rest of the behavior is undefined.
                //according to john, however, iibisid and subject should always be found
                var meta = qc.instance.parseMeta(h);
                h.qc_iibisid = meta.iibisid;
                h.qc_subject = meta.subject;
                h.qc_istemplate = meta.template;
                h.qc_series_desc = meta.series_desc;
                //h.qc_series_desc_version = meta.series_desc_version;

                //construct esindex
                var esindex = qc.instance.composeESIndex(h);
                logger.info(h.qc_iibisid+" subject:"+h.qc_subject+" esindex:"+esindex+" "+h.SOPInstanceUID);
                h.qc_esindex = esindex;
                next();
            } catch(err) {
                next(err);
            }
        },

        function(next) {
            var path = config.cleaner.raw_headers+"/"+h.qc_iibisid+"/"+h.qc_subject+"/"+h.StudyInstanceUID+"/"+h.qc_series_desc;
            write_to_disk(path, h, function(err) {
                if(err) throw err; //let's kill the app - to alert the operator of this critical issue
                //logger.debug("wrote to raw_headers");                
                next();
            });
        },

        function(next) {            
            var path2tar = config.cleaner.raw_headers+"/"+h.qc_iibisid+"/"+h.qc_subject+"/"+h.StudyInstanceUID+"/"+h.qc_series_desc+".tar"
            var path2file = config.cleaner.raw_headers+"/"+h.qc_iibisid+"/"+h.qc_subject+"/"+h.StudyInstanceUID+"/"+h.qc_series_desc+"/"+h.SOPInstanceUID+".json"
             logger.debug("tarball -- storing file>> "+ path2file);
            write_to_tar(path2tar,path2file, function(err) {
                if(err) throw err; //let's kill the app - to alert the operator of this critical issue
                //logger.debug("wrote to tar");                
                next();
            });
        },

        function(next) {
            try {       
                qc.instance.clean(h);                 
                console.log('cleaned image: '+h.SOPInstanceUID)
                next();
            } catch(err) {
                next(err);
            }
        },


        function(next) {
            //ignore all image/template with SeriesNumber > 200
            // AAK - large SeriesNumber's identify reconstructed images which should not be inserted in the database
            if(h.Modality == "MR") {
                if(h.SeriesNumber > 200) {
                    return next("MR image SeriesNumber is >200:"+h.SeriesNumber);
                }
            } else {
                if(h.SeriesNumber > 100) {
                    return next("image SeriesNumber is >100:"+h.SeriesNumber);
                }
            } 
            next();
        },
        
        // AAK - we need this 

        // //set the default ACL for new IIBISids
        // function(next) {
        //     db.Acl.findOne({key: config.acl.key}, function(err, acl) {
        //         if (err) {
        //             console.log('error looking up ACLs');
        //             return next();
        //         }
        //         if (!acl) {
        //             console.log('unable to locate ACLs');
        //             return next();
        //         } else if (typeof acl.value[h.qc_iibisid] === 'undefined') {
        //             acl.value[h.qc_iibisid] = {};
        //             for( let a of config.acl.actions) {
        //                 acl.value[h.qc_iibisid][a] = { users : [], groups : config.acl.default_groups}
        //             }
        //         } else {
        //             for( let a of config.acl.actions) {
        //                 if(acl.value[h.qc_iibisid][a].groups.indexOf(config.acl.default_groups[0]) < 0){
        //                     acl.value[h.qc_iibisid][a].groups = acl.value[h.qc_iibisid][a].groups.concat(config.acl.default_groups);
        //                     //console.log(acl.value[h.qc_iibisid][a].groups);
        //                 }
        //             }
        //         }
        //         db.Acl.findOneAndUpdate({key: config.acl.key}, {value: acl.value}, {upsert: true}, function (err, doc) {
        //             if (err) console.log('error updating ACLs');
        //             return next();
        //         });
        //     });
        // },

        //make sure we know about this research
        function(next) {
            //TODO radio_tracer should always be set for CT.. right? Should I validate?
            var radio_tracer = null;
            if(h.RadiopharmaceuticalInformationSequence && h.RadiopharmaceuticalInformationSequence.length > 0) {
                //AAK - h.RadiopharmaceuticalInformationSequence is an array with a single entry. Can there be more than 1 entry? - for now just pick the first one
                radio_tracer = h.RadiopharmaceuticalInformationSequence[0].Radiopharmaceutical;                
            }
            db.Research.findOneAndUpdate({
                IIBISID: h.qc_iibisid,
                Modality: h.Modality,
                StationName: h.StationName, 
                radio_tracer: radio_tracer                               
            }, {}, {upsert:true, 'new': true}, function(err, _research) {
                if(err) return next(err);
                research = _research;
                next();
            });
        },
        
        //make sure we know about this exam 
        function(next) {
            db.Exam.findOneAndUpdate({
                StudyInstanceUID: h.StudyInstanceUID, 
            },
            {
                $addToSet: {series:{series_desc:h.qc_series_desc, SeriesNumber: h.SeriesNumber,status:null}},
                subject: (h.qc_istemplate?null:h.qc_subject),
                research_id: research._id,
                istemplate:h.qc_istemplate
            },
            {upsert:true, 'new': true}, function(err, _exam) {
                if(err) return next(err);
                exam = _exam;
                next();
            });
        },
        
        //make sure we know about this template and insert template header
        function(next) {
            if(h.qc_istemplate==false) return next();  //if not a template then skip

            db.Template.findOneAndUpdate({
                research_id: research._id,
                exam_id: exam._id,
                series_desc: h.qc_series_desc,
                SeriesNumber: h.SeriesNumber,   
                date: h.qc_StudyTimestamp             
            }, {}, {upsert:true, 'new': true}, 
            function(err, _template) {
                if(err) return next(err);
                template = _template; 

                // Make sure this header is not in the databse already
                db.TemplateHeader.findOne({
                    SOPInstanceUID: h.SOPInstanceUID
                }, function(err,repeated_header) {
                    if (err) return next(err);
                    if (repeated_header) {
                        logger.info("Repeated template header identified -- Please delete previous version before overwriting!!");   
                        return next("Cannot overwrite template headers as some series may be have been QC-ed with this template");                     
                    } else {
                        // Check if a primary image already exists for this series
                        db.TemplateHeader.findOne({
                            template_id: template._id,
                            primary_image: null,                               
                        }, function(err, _primary_template) {
                            if (err) return next(err);
                            if (!_primary_template) {
                                db.TemplateHeader.create({
                                    template_id: template._id,
                                    SOPInstanceUID: h.SOPInstanceUID,
                                    InstanceNumber: h.InstanceNumber,
                                    //EchoNumbers: h.EchoNumbers !== undefined ? h.EchoNumbers : null,
                                    primary_image: null,
                                    headers: h
                                }, function(err,primary_template) {
                                    if (err) return next(err);
                                    var deprecated_by = deprecatedByTemplate(template);
                                    console.log("derprecated_by " + deprecated_by)
                                    // finally, insert primary_template._id into the template document  
                                    db.Template.updateOne({_id: template._id}, 
                                    {
                                        primary_image:primary_template._id,
                                        deprecated_by: deprecated_by !== "undefined"? deprecated_by : null
                                    }, function(err) {
                                        if (err) return next(err);  
                                        return next();                              
                                    });
                                })                                
                            } else {
                                //var echonumber = h.EchoNumbers;
                                qc.instance.compare_with_primary(_primary_template.headers,h,function(){
                                    db.TemplateHeader.create({
                                        template_id: template._id,
                                        SOPInstanceUID: h.SOPInstanceUID,
                                        InstanceNumber: h.InstanceNumber,
                                        //EchoNumbers: echonumber !== undefined ? echonumber : null,                           
                                        primary_image: _primary_template._id,
                                        headers:h
                                    }, function(err) {
                                        if(err) return next(err);
                                        return next();
                                    });
                                }); 
                            }
                        })
                    }
                })
            });
        },
        
        //make sure we know about this series
        function(next) {
            if(h.qc_istemplate==true) return next();  //if it's template then skip
            
            // Make sure this header is not in the databse already
            db.Image.findOne({
                SOPInstanceUID: h.SOPInstanceUID
            }, function(err,repeated_header) {
                if (err) return next(err);
                if (repeated_header) {
                    logger.info("Repeated image header identified");   
                    return next("Repeated image header identified -- aborting!!");  
                    // AAK -- WHAT TO DO HERE!!!
                } else {
                    db.Series.findOneAndUpdate({
                        exam_id: exam._id,
                        series_desc: h.qc_series_desc,
                        SeriesNumber: h.SeriesNumber,
                        isexcluded: qc.series.isExcluded(h.Modality, h.qc_series_desc)
                    }, {}, {upsert: true, 'new': true}, 
                    function(err, _series) {   
                        if(err) return next(err);
                        series = _series;  

                        // Check if a primary image already exists for this series
                        db.Image.findOne({
                            series_id: series._id,
                            primary_image: null,                               
                        }, function(err, _primary_image) {
                            if (err) return next(err);
                            if (!_primary_image) {
                                db.Image.create({
                                    series_id: series._id,
                                    SOPInstanceUID: h.SOPInstanceUID,
                                    InstanceNumber: h.InstanceNumber,
                                    //EchoNumbers: h.EchoNumbers !== undefined ? h.EchoNumbers : null,
                                    primary_image: null,
                                    headers: h
                                }, function(err,primary_image) {
                                    if (err) return next(err);
                                    var deprecated_by = deprecatedBySeries(series);
                                    // finally, insert primary_image._id into the series document  
                                    db.Series.updateOne({_id: series._id}, 
                                    {
                                        primary_image:primary_image._id,
                                        deprecated_by: deprecated_by !== "undefined"? deprecated_by : null
                                    }, function(err) {
                                        if (err) return next(err);  
                                        return next();                              
                                    });
                                })                                
                            } else {
                                // Check if series has been QC-ed already (i.e. if this is a new image for an existing series)
                                db.Series.find({_id: series._id, qc: {$exists: true}}).exec(function(err,qced_series) {
                                    if (err) return next(err);
                                    if (qced_series) {  // remove embedded qc objects from series and from all images in the series                                        
                                        db.Series.update({_id:series._id}, {$unset:{qc:1}},{multi:false}, function(err) {
                                            if (err) return next(err);                                        
                                            // db.Image.update({series_id:series._id}, {$unset:{qc:1}},{multi:true}, function(err) {
                                            //     if (err) return next(err);
                                            // })  AAK -- not sure that I need this; perhaps the qc object for images can be overwritten? 
                                        })
                                    }
                                    // Finally, insert the image in the database
                                    //var echonumber = h.EchoNumbers;
                                    qc.instance.compare_with_primary(_primary_image.headers,h,function(){
                                        db.Image.create({
                                            series_id: series._id,
                                            SOPInstanceUID: h.SOPInstanceUID,
                                            InstanceNumber: h.InstanceNumber,
                                            //EchoNumbers: echonumber !== undefined ? echonumber : null,                         
                                            primary_image: _primary_image._id,
                                            headers:h
                                        }, function(err) {
                                            if(err) return next(err);
                                            return next();
                                        });
                                    });
                                });
                            }
                        });
                    });
                }
            });
        },
                

    ], function(err) {
        //all done
        if(err) {
            logger.error(err);
            h.qc_err = err;
            conn.publish(config.cleaner.failed_q, h); //publishing to default exchange can't be confirmed?
            write_to_disk(config.cleaner.failed_headers, h, function(err) {
                if(err) throw err; //TODO - will crash app. Maybe we should remove this if we want this to run continuously
                ack.acknowledge(); 
            });
        } else {
            //all good then.
            ack.acknowledge();
        }
    });
}

var deprecatedBySeries = function(series) {    
    db.Series.update({
        exam_id: series.exam_id,
        series_desc: series.series_desc,
        SeriesNumber: { $lt: series.SeriesNumber },
    }, {
        deprecated_by: series._id,
    },{multi: true}, function(err) {        
        if (err) logger.warn("error deprecating older series");
    });

    db.Series.findOne({
        exam_id: series.exam_id,
        series_desc: series.series_desc,
        SeriesNumber: { $gt: series.SeriesNumber },
    }, function(err, _series){
        if(err) {
            logger.warn("error deprecating current series");
            return (null);
        }
        if(!_series) return (undefined); //series.deprecated_by = null;
        if(_series) return (_series._id); //series.deprecated_by = _series._id;
    }); 
}

var deprecatedByTemplate = function(template) {    
    db.Template.update({
        exam_id: template.exam_id,
        series_desc: template.series_desc,
        SeriesNumber: { $lt: template.SeriesNumber },
    }, {
        deprecated_by: template._id,
    },{multi: true}, function(err,numdeprecated) {        
        if (err) logger.warn("error deprecating older template");
        console.log(numdeprecated);
    });

    db.Template.findOne({
        exam_id: template.exam_id,
        series_desc: template.series_desc,
        SeriesNumber: { $gt: template.SeriesNumber },
    }, function(err, _template){
        if(err) {
            logger.warn("error deprecating current series");
            return (null);
        }
        if(!_template) return (undefined); //series.deprecated_by = null;
        if(_template) return (_template._id); //series.deprecated_by = _series._id;
    }); 
}

function write_to_tar(path2tar, path2file, cb) {
    tar.u({file: path2tar},[path2file]
    ).then(cb);
}


function write_to_disk(dir, h, cb) {
    fs.exists(dir, function (exists) {
        //if(!exists) fs.mkdirSync(dir);
        if(!exists) mkdirp.sync(dir);
        fs.writeFile(dir+"/"+h.SOPInstanceUID+".json", JSON.stringify(h,null,4), cb);
    });
}

// function compare_with_primary(primaryImg,h,cb) {

//     for (var k in primaryImg) {     
//         v = primaryImg[k];  
//         if (h.hasOwnProperty(k) && h[k] !== undefined) {
//             if (['qc_istemplate'].indexOf(k) < 0) { 
//                 if (!Array.isArray(v) && !isObject(v) && h[k] === v) {  
//                     //console.log('deleting field: '+k +' -- ' + h[k]);
//                     delete h[k]
//                 } 
//                 else if (Array.isArray(v) || isObject(v)) {
//                     if (isEqual(v,h[k]) == true) delete h[k];
//                 }
//             }  
//         } else {//if (!h[k]) {
//             h[k] = "not_set"; // label fields that are not in the primary
//         }
   
//     }
//     cb();
// }

// function isObject (value) {
//     return value && typeof value === 'object' && value.constructor === Object;
// }


// var isEqual = function (field1, field2) {

// 	var type = Object.prototype.toString.call(field1);
// 	if (type !== Object.prototype.toString.call(field2)) return false;

// 	var len1 = type === '[object Array]' ? field1.length : Object.keys(field1).length;
// 	var len2 = type === '[object Array]' ? field2.length : Object.keys(field2).length;
// 	if (len1 !== len2) return false;

// 	var compare = function (item1, item2) {
// 		var itemType = Object.prototype.toString.call(item1);

// 		if (['[object Array]', '[object Object]'].indexOf(itemType) >= 0) {
// 			if (!isEqual(item1, item2)) return false;
// 		}
// 		else {
//             if (itemType !== Object.prototype.toString.call(item2)) return false;
//             if (item1 !== item2) return false;
// 		}
//     };
    
// 	if (type === '[object Array]') {
// 		for (var i = 0; i < len1; i++) {
// 			if (compare(field1[i], field2[i]) === false) return false;
// 		}
// 	} else {
// 		for (var key in field1) {
// 			if (field1.hasOwnProperty(key)) {
// 				if (compare(field1[key], field2[key]) === false) return false;
// 			}
// 		}
// 	}
// 	return true;

// };