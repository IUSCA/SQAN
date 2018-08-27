#!/usr/bin/node

//node
var fs = require('fs');

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
    var primary_image = null;
    var aq = null;

    async.series([
        function(next) {
            try {
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
                h.qc_series_desc_version = meta.series_desc_version;

                //construct esindex
                var esindex = qc.instance.composeESIndex(h);
                logger.info(h.qc_iibisid+" subject:"+h.qc_subject+" esindex:"+esindex+" "+h.SOPInstanceUID);
                h.qc_esindex = esindex;
                console.log('image is a template: '+h.qc_istemplate)
                next();
            } catch(err) {
                next(err);
            }
        },

        function(next) {
            //store a copy of raw input before cleaning
            var path = config.cleaner.raw_headers+"/"+h.qc_iibisid+"/"+h.qc_subject+"/"+h.StudyInstanceUID+"/"+h.qc_series_desc;
            //logger.debug("storing header to "+path);
            write_to_disk(path, h, function(err) {
                if(err) throw err; //let's kill the app - to alert the operator of this critical issue
                //logger.debug("wrote to raw_headers");
                next();
            });
        },

        function(next) {
            try {       
                qc.instance.clean(h);
                console.log('after cleaning image is a template: '+h.qc_istemplate)
                next();
            } catch(err) {
                next(err);
            }
        },

        // ********************************
        // AAK -- do we really need to store the cleaned data? It might be better to store a copy of the raw data and not store the clean....
        // ********************************
        // function(next) {
        //     //store clearned data to cleaned directory
        //     var path = config.cleaner.cleaned+"/"+h.qc_iibisid+"/"+h.qc_subject+"/"+h.StudyInstanceUID+"/"+h.qc_series_desc;
        //     //logger.debug("storing headers to "+path);
        //     write_to_disk(path, h, function(err) {
        //         if(err) logger.error(err); //continue
        //         next();
        //     });
        // },

        // ********************************
        // AAK -- why do we do this???
        // ********************************
        function(next) {
            //ignore all image/template with SeriesNumber > 200
            //console.dir(h.SeriesNumber);
            if(h.Modality == "MR") {
                if(h.SeriesNumber > 200) {
                    return next("SeriesNumber is >200:"+h.SeriesNumber);
                }
            } else {
                if(h.SeriesNumber > 100) {
                    return next("SeriesNumber is >100:"+h.SeriesNumber);
                }
            } 
            next();
        },
        
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
            // AAK --  make radio_tracer an array and store all radio_tracers
            var radio_tracer = [];
            if(h.RadiopharmaceuticalInformationSequence && h.RadiopharmaceuticalInformationSequence.length > 0) {
                //TODO - what should I do if there are more than 1? - for now just pick the first one
                // AAK -- store radio tracers in array
                //radio_tracer = h.RadiopharmaceuticalInformationSequence[0].Radiopharmaceutical;
                h.RadiopharmaceuticalInformationSequence.forEach(function(rt) {
                    radio_tracer.push(rt.Radiopharmaceutical);
                  });                
            }
            db.Research.findOneAndUpdate({
                IIBISID: h.qc_iibisid,
                Modality: h.Modality,
                StationName: h.StationName,                                
            }, {radio_tracer: radio_tracer}, {upsert:true, 'new': true}, function(err, _research) {
                if(err) return next(err);
                research = _research;
                next();
            });
        },
        
        //make sure we know about this exam 
        function(next) {
            if(h.qc_istemplate) return next();  //if it's template then skip

            db.Exam.findOneAndUpdate({
                research_id: research._id,
                subject: (h.qc_istemplate?null:h.qc_subject),
                date: h.qc_StudyTimestamp, 
            }, {},
                // {$push: {series_desc:h.qc_series_desc}},  // push into array of series descriptions
            {upsert:true, 'new': true}, function(err, _exam) {
                if(err) return next(err);
                exam = _exam;
                next();
            });
        },
        
        //make sure we know about this template 
        function(next) {
            if(h.qc_istemplate==false) {
                console.log('This is NOT a template -- should not go into Template')   
                return next();  //if not a template then skip
            }
            console.log('template: ' + h.qc_istemplate+ ' -- querrying template db...' )
            db.Template.findOneAndUpdate({
                research_id: research._id,
                series_desc: h.qc_series_desc,
                SeriesNumber: h.SeriesNumber,                
            }, {date: h.qc_StudyTimestamp},  //headers: h, //update with the latest headers (or mabe we should store all under an array?)
            {upsert:true, 'new': true}, function(err, _template) {
                if(err) return next(err);
                template = _template;
                //store template header
                db.TemplateHeader.findOne({
                    template_id: template._id,
                    primary_image: null
                }, function(err, _primarytemplate) {
                    if(err) return next(err);
                    if (!_primarytemplate) {   
                        console.log('primary template header not found')                     
                        db.TemplateHeader.create({
                            template_id: template._id,
                            InstanceNumber: h.InstanceNumber,
                            EchoNumbers: h.EchoNumbers !== undefined ? h.EchoNumbers : null,
                            primary_image: null,
                            headers:h
                        },function(err,_primary_template) {
                            if (err) return next(err);
                            console.log('assigning primary template to template '+ _primary_template._id);
                            // finally, insert primary_template._id into the template collection  
                            db.Template.updateOne({
                                _id: template._id
                            }, {primary_image:_primary_template._id}, function(err,s) {if (err) return next(err)});                          
                        })    
                        next();
                    } else if(_primarytemplate) {
                        console.log('primary template header already exists... compressing current template header')                     
                        compare_with_primary(_primarytemplate.headers,h,function(err){
                            if(err) throw err;
                            console.log('this is the compressed template header: ')
                            console.log(h)
                        });
                        db.TemplateHeader.findOneAndUpdate({
                            template_id: template._id,
                            InstanceNumber: h.InstanceNumber,
                            EchoNumbers: h.EchoNumbers !== undefined ? h.EchoNumbers : null,
                        }, {primary_image: _primarytemplate._id,
                            headers:h
                        },{upsert:true, 'new': false}, function(err, _tempheader) {
                            if(err) return next(err);
                            //I am setting new:false so that _image will be null if this is the first time
                            if(_tempheader) {
                                logger.warn("template header already inserted");
                            }
                            next();
                        });                          
                    }
                });
            });
        },
        
        //make sure we know about this series
        function(next) {
            if(h.qc_istemplate==true) {
                console.log('This is a template -- should not go into Series')   
                return next();  //if it's template then skip
            }
            console.log('template: ' + h.qc_istemplate+ ' -- querrying series db...' )
            db.Series.findOneAndUpdate({
                exam_id: exam._id,
                series_desc: h.qc_series_desc,
                SeriesNumber: h.SeriesNumber,
            }, {  //AAK -- is it ok for these to be updated every time? why are we updating the studyinstanceUID?
                StudyInstanceUID: h.StudyInstanceUID,  
                isexcluded: qc.series.isExcluded(h.Modality, h.qc_series_desc),
            }, {upsert: true, 'new': true}, function(err, _series) {   
                if(err) return next(err);
                series = _series;                

                db.Image.findOne({
                    series_id: series._id,                    
                    primary_image: null
                }, function(err, _primaryimage) {
                    if(err) return next(err);
                    if (!_primaryimage) {   // AAK -- if primary does NOT exist, there should be no images for this series-- should I check for this? 
                        console.log('primary image not found');
                        // db.Images.find({series_id: series._id}, function(err,_images) {
                        //     if(err) return next(err);
                        //     if (_images) {
                        //         logger.warn('There is no primary image for this series, but there are images inserted for this series!');
                        //         return next(err);
                        //     }
                        // })                     
                        db.Image.findOneAndUpdate({
                            series_id: series._id,
                            InstanceNumber: h.InstanceNumber,
                            EchoNumbers: h.EchoNumbers !== undefined ? h.EchoNumbers : null,
                            primary_image: null,
                        }, {headers:h},
                        {upsert:true, 'new': true}, function(err,_primary_image) {
                            if (err) return next(err);
                            console.log('assigning primary_image to series '+ _primary_image._id);
                            primary_image = _primary_image;
                            // finally, insert primary_image._id into the series collection
                            db.Series.updateOne({
                                _id: series._id
                            }, {primary_image:primary_image._id}, function(err,s) {if (err) return next(err)});
                        }) 
                        next();
                    } else if(_primaryimage) {
                        console.log('primary image already exists... compressing current image before inserting')                     
                        // primary image exists, so we compress current image header
                        compare_with_primary(_primaryimage.headers,h,function(err){
                            if(err) throw err;
                        });
                        db.Image.findOneAndUpdate({
                            series_id: series._id,
                            InstanceNumber: h.InstanceNumber,
                            EchoNumbers: h.EchoNumbers !== undefined ? h.EchoNumbers : null,
                            primary_image: _primaryimage._id,
                        }, {headers:h},
                        {upsert:true, 'new': false}, function(err, _image) {
                            if(err) return next(err);
                            //I am setting new:false so that _image will be null if this is the first time
                            if(_image) {
                                logger.warn("image already inserted - not sending to es since it can't update");                                
                            }
                            //I am now setting document_id on logstash. Elasticsearch can update the document as long as document_id matches and index name
                            //stays the same!
                            cleaned_ex.publish('', h, {}, function(err) {
                                next(err);
                            });
                        });
                    }                                        
                });
            });
        },

        // //deprecate older series under the same series_desc
        // //sometimes these show up out of order!
        // function(next) {
        //     if(h.qc_istemplate) return next();  //if it's template then skip
        //     db.Series.update({
        //         research_id: research._id,
        //         exam_id: exam._id,
        //         series_desc: h.qc_series_desc,
        //         SeriesNumber: { $lt: h.SeriesNumber },
        //     }, {
        //         deprecated_by: series._id,
        //     }, {multi: true}, next);
        // },

        // //looks for newer updated series and deprecate this one with that series
        // function(next) {
        //     db.Series.findOne({
        //         research_id: research._id,
        //         exam_id: exam._id,
        //         series_desc: h.qc_series_desc,
        //         SeriesNumber: { $gt: h.SeriesNumber },
        //         deprecated_by: null
        //     }, function(err, _series){
        //         if(err) {
        //             console.log('error deprecating older series');
        //             console.log(err);
        //             return next();
        //         }
        //         if(!_series){
        //             return next();
        //         }
        //         db.Series.findOneAndUpdate({
        //             research_id: research._id,
        //             exam_id: exam._id,
        //             series_desc: h.qc_series_desc,
        //             SeriesNumber: h.SeriesNumber,
        //         }, {
        //             deprecated_by: _series._id,
        //         }, next);
        //     })
        // },

        // //make sure we know about this acquisition
        // function(next) {
        //     if(h.qc_istemplate) return next();  //if it's template then skip

        //     db.Acquisition.findOneAndUpdate({
        //         series_id: series._id,
        //         AcquisitionNumber: h.AcquisitionNumber,
        //     }, {
        //         research_id: research._id,
        //         exam_id: exam._id,
        //         series_id: series._id,
        //     }, {upsert:true, 'new': true}, function(err, _aq) {
        //         if(err) return next(err);
        //         aq = _aq;
        //         next();
        //     });
        // },
        

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

function write_to_disk(dir, h, cb) {
    fs.exists(dir, function (exists) {
        //if(!exists) fs.mkdirSync(dir);
        if(!exists) mkdirp.sync(dir);
        fs.writeFile(dir+"/"+h.SOPInstanceUID+".json", JSON.stringify(h,null,4), cb);
    });
}

function compare_with_primary(primaryImg,h,cb) {
    for (var k in primaryImg) {     
        v = primaryImg[k]; 
        //AAK -- these are identifiers so we don't want to remove them; should we add other non-removable fields?  
        if (['qc_istemplate','SeriesNumber'].indexOf(k) < 0) {
            if (!Array.isArray(v) && !isObject(v) && h.hasOwnProperty(k) && h[k] === v) {  
                //console.log('deleting field: '+k +' -- ' + h[k]);
                delete h[k]
            } 
            else if (Array.isArray(v) || isObject(v)) {
                if (isEqual(v,h[k]) == true) {
                    delete h[k];
                }
            }
        }     
    }
}

function isObject (value) {
    return value && typeof value === 'object' && value.constructor === Object;
}


var isEqual = function (value, other) {

	// Get the value type
	var type = Object.prototype.toString.call(value);
	// If the two objects are not the same type, return false
	if (type !== Object.prototype.toString.call(other)) return false;
    
    // If items are not an object or array, return false
	//if (['[object Array]', '[object Object]'].indexOf(type) < 0) return false;  // from compre_with_primary we already know that items are array or object

	// Compare the length of the length of the two items
	var valueLen = type === '[object Array]' ? value.length : Object.keys(value).length;
	var otherLen = type === '[object Array]' ? other.length : Object.keys(other).length;
	if (valueLen !== otherLen) return false;

	// Compare two items
	var compare = function (item1, item2) {
		var itemType = Object.prototype.toString.call(item1);

		// If an object or array, compare recursively
		if (['[object Array]', '[object Object]'].indexOf(itemType) >= 0) {
			if (!isEqual(item1, item2)) return false;
		}
		// Otherwise, do a simple comparison
		else {
			// If the two items are not the same type, return false
            if (itemType !== Object.prototype.toString.call(item2)) return false;
            if (item1 !== item2) return false;
			// Else if it's a function, convert to a string and compare
			// Otherwise, just compare
			// if (itemType === '[object Function]') {
			// 	if (item1.toString() !== item2.toString()) return false;
			// } else {
			// 	if (item1 !== item2) return false;
			// }
		}
	};
	// Compare properties
	if (type === '[object Array]') {
		for (var i = 0; i < valueLen; i++) {
			if (compare(value[i], other[i]) === false) return false;
		}
	} else {
		for (var key in value) {
			if (value.hasOwnProperty(key)) {
				if (compare(value[key], other[key]) === false) return false;
			}
		}
	}
	// If items are equal then return true
	return true;

};