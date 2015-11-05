

exports.isExcluded = function(modality, series_desc) {
    switch(modality) {
    case "MR":
        if(series_desc == "MoCoSeries") return true;
        break;

    case "CT":
    case "PT":
    default:
    }
    return false;
}
