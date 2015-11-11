
//ECMA6 Polyfill for endsWith
if (!String.prototype.endsWith) {
  String.prototype.endsWith = function(searchString, position) {
      var subjectString = this.toString();
      if (typeof position !== 'number' || !isFinite(position) || Math.floor(position) !== position || position > subjectString.length) {
        position = subjectString.length;
      }
      position -= searchString.length;
      var lastIndex = subjectString.indexOf(searchString, position);
      return lastIndex !== -1 && lastIndex === position;
  };
}

exports.isExcluded = function(modality, series_desc) {
    switch(modality) {
    case "MR":
        if(series_desc == "MoCoSeries") return true;
        if(series_desc.endsWith("_ADC")) return true;
        if(series_desc.endsWith("_TRACEW")) return true;
        if(series_desc.endsWith("_FA")) return true;
        if(series_desc.endsWith("_SBRef")) return true;
        break;

    case "CT":
    case "PT":
    default:
    }
    return false;
}
