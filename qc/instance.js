
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
