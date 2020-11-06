
var _ = require('underscore');
var async = require('async');
var db = require('../models');


//custom QC logics to be applied to all modality (unless overridden)
var common_customs = {
    "ImageOrientationPatient" : function(k, v, tv, qc) {
        if(!check_set(k, v, tv, qc)) return;
        if(v.constructor === Array && tv.constructor === Array && v.length == tv.length) {
            v.forEach(function(av, idx) {
                check_absolute_diff(k, av, tv[idx], qc, 'errors', 0.3, tv);
            });
        } else {
            qc.errors.push({type: 'template_mismatch', k: k, v: v, tv: tv, msg: "template and value do not match in type or length"});
        }
    },
}
//custom QC logics specific to each modality
var customs = {
    "MR": _.extend({
        "TriggerTime" : function(k, v, tv, qc) {
            if(!check_set(k, v, tv, qc)) return;
            var fv = convertToFloat(v, k);
            var ftv = convertToFloat(tv, k);
            return check_absolute_diff(k, fv, ftv, qc, 'errors', 3);
        },
        "p_CoilString" : function(k, v, tv, qc) {
            if(!check_set(k, v, tv, qc)) return;
            if(tv.includes("HEA/HEP")) {
                return check_equal(k, v, tv, qc);
            } else {
                if(tv.includes('HE')) {
                    if(!v.includes('HE')) {

                        return qc.errors.push({type: 'template_mismatch', k: k, v: v, tv: tv, msg: "value doesn't match with template value"});
                    } else {
                        return true;
                    }
                }

                if(tv.includes('HC')) {
                    if(!v.includes('HC')) {
                        return qc.errors.push({type: 'template_mismatch', k: k, v: v, tv: tv, msg: "value doesn't match with template value"});
                    } else {
                        return true;
                    }
                }

                return check_equal(k, v, tv, qc);
            }
        }

    }, common_customs),

    "CT": _.extend({

    }, common_customs),

    "PT": _.extend({
        "NumberOfTimeSlices ": function(k, v, tv, qc) {
            if(v === undefined) return; //ok if it doesn't exist This tag appears in dynamic PET scans only.
            check_equal(k, v, tv, qc);
        },

        "RadiopharmaceuticalInformationSequence": function(k, v, tv, qc) {
            if(!check_set(k, v, tv, qc)) return;
            //sometimes they are not set..
            if(tv[0]) {
                delete tv[0].RadiopharmaceuticalStartTime;
                delete tv[0].RadionuclideTotalDose;
                delete tv[0].RadiopharmaceuticalStartDateTime
            }
            if(v[0]) {
                delete v[0].RadiopharmaceuticalStartTime;
                delete v[0].RadionuclideTotalDose;
                delete v[0].RadiopharmaceuticalStartDateTime
            }
            check_equal(k, v, tv, qc);
        },
    }, common_customs)
};


function skip(k, v, tv, qc) {}

function check_set(k, v, tv, qc) {
    //raise error if the field is missing
    if(v === undefined) {
        qc.errors.push({type: 'not_set', k: k, tv: tv, msg: "key is missing"});
        return false;
    }
    return true;
}

//just compare v v.s. tv and raise error if they don't match
function check_equal(k, v, tv, qc) {
    if(v !== null && v.constructor === Array && tv.constructor === Array && v.length == tv.length) {
        v.forEach(function(av, idx) {
            check_percent_diff(k, av, tv[idx], qc, 'errors', 0.1, tv);
        });
        return;
    } else if(v !== null && (v.constructor === Array || tv.constructor === Array)){
        qc.errors.push({type: 'template_mismatch', k: k, v: v, tv: tv, msg: "template and value do not match in either type or length"});
        return;
    }

    if(typeof v === 'number') {
        //sundar (Regarding ranges, for example: we can use color green for +/-  for target 0.01% difference. Color Yellow for 10% difference, and color Red beyond.)
        if(v == 0 && tv == 0) {
            //both 0.. can't calculate percent difference (and it matches!)
        } else {
            //compute percent diff.
            var diff = Math.abs((v - tv)/((v+tv)/2));
            if(diff > 0.1) {
                qc.errors.push({type: 'template_mismatch', k: k, v: v, tv: tv, perdiff: diff, msg: "value is more than 10% off template value."});
                /*
                 } else if(diff > 0.01) {
                 qc.warnings.push({type: 'template_mismatch', k: k, v: v, tv: tv, msg: "value is more than 0.01% off template value"});
                 } else if (diff != 0) {
                 qc.warnings.push({type: 'template_mismatch', k: k, v: v, tv: tv, msg: "value is not exact match template value:"+diff});
                 }
                 */
                //} else if(diff != 0) {
            } else if(diff > 0.0001) {
                qc.warnings.push({type: 'template_mismatch', k: k, v: v, tv: tv, perdiff: diff, msg: "value does not match within 0.0001% of the template value."});
            }
        }
    } else {
        //string / array of something
        if(!_.isEqual(v, tv)) {
            qc.errors.push({type: 'template_mismatch', k: k, v: v, tv: tv, msg: "value doesn't match with template value"});
        }
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

function check_absolute_diff(k, v, tv, qc, r, th, a_tv) {
    var l = 'template_mismatch'

    var diff = Math.abs(v - tv);
    if(diff > th) {
        var err_v = tv;
        if(a_tv !== undefined) {
            err_v = a_tv;
        }
        qc[r].push({type: l, k: k, v: v, tv: err_v, msg: "value differs from template by more than "+th});
    };
};

function check_percent_diff(k, v, tv, qc, r, th, a_tv) {
    var l = 'template_mismatch'

    var diff = Math.abs((v - tv)/((v+tv)/2));
    if(diff > th) {
        var err_v = tv;
        if(a_tv !== undefined) {
            //console.log('a_tv', a_tv);
            err_v = a_tv;
        }
        qc[r].push({type: l, k: k, v: v, tv: err_v, msg: "value differs from template by more than "+th*100+"%"});
    };
};

//compare image headers against template headers
exports.match = function(image, template, c_keys, qc, cb_m) {

    var template_mismatch = 0;
    var not_set = 0;

    // console.log("QC-ing image " + image.InstanceNumber + " with template " + template.InstanceNumber);

    // //find exclusion list
    // var handler_list = [];


    var cus = customs[image.headers.Modality];
    if(!cus) {
        qc.errors.push({type: 'unknown_modality', msg: "unknown modality "+image.headers.Modality+" found for image:"+image.id});
        return;
    }

    // find fileds that are in image and not in template
    var tl = Object.keys(template.headers).length;
    var il = Object.keys(image.headers).length;

    // first check if image header has fields that are not in the template
    // var keydiff = [];
    // for (var kk in image.headers) {
    //     if(template.headers[kk] === undefined && cus[kk] !== undefined) keydiff.push({ik:kk,v:image.headers[kk]})
    // }
    // var lengthdiff = keydiff.length;
    // if (lengthdiff > 0) qc.warnings.push({type: 'image_tag_mismatch', k: keydiff, c: lengthdiff, msg: "image has "+ lengthdiff + " fields that are not found in the template"});


    //evaluate QC for each key in the precisionQC key list (aka whitelist model)

    async.each(c_keys, function(ck, cb) {

        let k = ck.key;

        var v = image.headers[k];
        var tv = template.headers[k];

        //don't need to check if not set in template
        if(tv === undefined) return cb();

        if(cus[k]) {
            // console.log("Evaluating custom");
            cus[k](k, v, tv, qc);
        } else {
            // console.log("Evaluating standard");
            if(!check_set(k, v, tv, qc)) return cb();
            check_equal(k, v, tv, qc);
        }

        cb()

    }, function(err){

        qc.errors.forEach(function(e) {
            if (e.type == 'template_mismatch') template_mismatch++;
            if (e.type == 'not_set') not_set++;
        })

        var error_stats = {
            template_mismatch: template_mismatch,
            not_set: not_set,
            template_field_count: tl,
            image_field_count: il,
            image_tag_mismatch: 0
        }

        // console.log(error_stats);

        qc.error_stats = error_stats;
        cb_m();
    })

    //compare each field of the template with the corresponding filed in the image

    // for(var k in template.headers) {
    //
    //     // let handler = c_keys.find(ck => ck.key == k);
    //     let handler = c_keys[k];
    //
    //
    //
    //     if(handler === undefined) {
    //         // console.log(`Unknown key: ${k}`)
    //         continue;
    //     }
    //
    //     if(handler.skip) {
    //         // console.log(`skipping key ${k}`)
    //         continue;
    //     }
    //
    //     var v = image.headers[k];
    //     var tv = template.headers[k];
    //     if(k.indexOf("qc_") === 0) continue;//ignore all qc fields
    //     if(k.indexOf("UID") !== -1 ) continue; //ignore all UID fields
    //
    //     if(cus[k]) {
    //         // console.log("Evaluating custom");
    //         cus[k](k, v, tv, qc);
    //     } else {
    //         // console.log("Evaluating standard");
    //         if(!check_set(k, v, tv, qc)) continue;
    //         check_equal(k, v, tv, qc);
    //     }
    // };
    //
    // qc.errors.forEach(function(e) {
    //     if (e.type == 'template_mismatch') template_mismatch++;
    //     if (e.type == 'not_set') not_set++;
    // })
    //
    // var error_stats = {
    //     template_mismatch: template_mismatch,
    //     not_set: not_set,
    //     template_field_count: tl,
    //     image_field_count: il,
    //     image_tag_mismatch: lengthdiff
    // }
    //
    // // console.log(error_stats);
    //
    // qc.error_stats = error_stats;
    // cb_m();
}


function overwritte_template(template_id,new_event,cb) {

    //console.log("overwriting template "+template_id)

    // Now Un-qc the series
    db.Template.update({
        _id: template_id,
    }, { $push: { events: new_event }},
    function(err) {
        if(err) return cb(err);
        // deprecate all images in that series
        db.TemplateHeader.deleteMany({
            template_id: template_id,
        }, function(err) {
            if(err) return cb(err);
            return cb();
        })
    })
}


exports.cc = common_customs;
exports.c = customs;
exports.overwritte_template = overwritte_template;
