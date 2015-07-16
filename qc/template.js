

//compose template name to use for each instance
exports.getName = function(h) {
    //Sundar mentions that currently StudyDescription are not unique.
    //Until we have more unique StudyDescription, we will be using following formula as "StudyDescription"
    return h.PatientName+"."+h.Modality+"."+h.ManufacturerModelName;
    //return h.StudyDescription;
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
];
