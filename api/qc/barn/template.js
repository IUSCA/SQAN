

//compose template name to use for each instance
exports.getName = function(h) {
    //return h.StudyDescription;
    
    //Sundar mentions that currently StudyDescription are not unique.
    //Until we have more unique StudyDescription, we will be using following formula as "StudyDescription"
    var iibisid = h.PatientName.split("^")[0];
    return iibisid+"."+h.Modality+"."+h.ManufacturerModelName;
}

//don't check these fields for template check
exports.ignore = [
    "PatientName",
    "PatientID",
    "PatientBirthDate",
    "PatientSex",
    "PatientAge",
    "PatientSize",
    "PatientWeight",
    "MediaStorageSOPClassUID",
    "MediaStorageSOPInstanceUID",
    "TransferSyntaxUID",
    "ImplementationClassUID",
    "SOPClassUID",
    "SOPInstanceUID",
    "IrradiationEventUID",
    "StudyInstanceUID",
    "SeriesInstanceUID",
    "FrameOfReferenceUID",
    "StudyID",
    "AcquisitionDateTime",
    "StudyTime",
    "SeriesTime",
    "AcquisitionTime",
    "ContentTime",
    "StudyDate",
    "SeriesDate",
    "AcquisitionDate",
    "ContentDate",
    "PatientBirthDate",
    "DateOfLastCalibration",

    "Unknown Tag & Data",
    "qc_AcquisitionTimestamp",
    "qc_ContentTimestamp",
    "qc_InstanceCreationTimestamp",
];
