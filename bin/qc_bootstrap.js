var async = require('async')
var db = require('../api/models');

let keywords = {
    common: {
        "AcquisitionNumber": 'skip', //not yet OK-ed by all of us..
        "AcquisitionDate": 'skip',
        "AcquisitionTime": 'skip',
        "AcquisitionDateTime": 'skip', //from CT..

        "FrameOfReferenceUID": 'skip',

        "ContentDate": 'skip',
        "ContentTime": 'skip',
        "CSAImageHeaderVersion": 'skip',
        "CSASeriesHeaderVersion": 'skip',

        "DateOfLastCalibration": 'skip',
        "DeidentificationMethod": 'skip',
        "DeidentificationMethodCodeSequence": 'skip',

        "ImagePositionPatient": 'skip',
        "ImageOrientationPatient": 'custom',

        "MedComHistoryInformation": 'skip',
        "MediaStorageSOPInstanceUID": 'skip',

        "SeriesDate": 'skip',
        "SeriesInstanceUID": 'skip',
        "SeriesNumber": 'skip',
        "SeriesTime": 'skip',

        //SeriesDescription is used to find a template, so there is no point of QC-ing this
        "SeriesDescription": 'skip',

        "StudyDate": 'skip',
        "StudyID": 'skip',
        "StudyInstanceUID": 'skip',
        "StudyTime": 'skip',

        "SOPInstanceUID": 'skip',
        "SOPClassUID": 'skip',

        "PatientAge": 'skip',
        "PatientBirthDate": 'skip',
        "PatientComments": 'skip',
        "PatientID": 'skip',
        "PatientName": 'skip',
        "PatientSex": 'skip',
        "PatientSize": 'skip',
        "PatientWeight": 'skip',
        "PatientIdentityRemoved": 'skip',

        "PixelData": 'skip',
        "PaletteColorLookupTableUID": 'skip',
        "RelatedSeriesSequence": 'skip', //we are receiving unhashed SOPInstanceUID inside this field. Sundar told me to skip this for now
        "SliceLocation": 'skip',
        "TableHeight": 'skip',
        "TimeOfLastCalibration": 'skip',
        "ReferringPhysicianName": 'skip',

        "Unknown Tag & Data": 'skip',
        // "p_CoilString": 'skip',
        "p_SlicePosition": 'skip',
        "p_SlicePositionPCS": 'skip',
        "p_ImaRelTablePosition": 'skip',
        "p_RelTablePosition": 'skip',
        "p_SliceOrientation": 'skip',
        "p_TimeAfterStart": 'skip',
        "p_MeasDuration": 'skip',
        "p_RBMocoRot": 'skip',
        "p_RBMocoTrans": 'skip',
    },

    MR: {
        "AccessionNumber": 'skip',

        "BluePaletteColorLookupTableData": 'skip',
        "BluePaletteColorLookupTableDescriptor": 'skip',
        "CodeMeaning": 'skip',
        "CodeValue": 'skip',
        "CodingSchemeDesignator": 'skip',
        "CodingSchemeVersion": 'skip',
        "CommentsOnThePerformedProcedureStep": 'skip',

        "ContinuityOfContent": 'skip',
        "dBdt": 'skip',
        "GenericGroupLength": 'skip',
        "GreenPaletteColorLookupTableData": 'skip',
        "GreenPaletteColorLookupTableDescriptor": 'skip',
        "ImageComments": 'skip',
        "ImagingFrequency": 'skip',
        "ImplementationVersionName": 'skip',
        "InstanceCreationDate": 'skip',
        "InstanceCreationTime": 'skip',
        "LargestImagePixelValue": 'skip',
        "MappingResource": 'skip',
        "NumericValue": 'skip',
        "OperatorsName": 'skip',
        "PerformedProcedureStepDescription": 'skip',
        "PerformedProcedureStepID": 'skip',
        "PerformedProcedureStepStartDate": 'skip',
        "PerformedProcedureStepStartTime": 'skip',
        "PerformingPhysicianName": 'skip',
        "PersonName": 'skip',
        "PhotometricInterpretation": 'skip',
        "PrivateCreator": 'skip',
        "PrivateGroupLength": 'skip',
        "RedPaletteColorLookupTableData": 'skip',
        "RedPaletteColorLookupTableDescriptor": 'skip',
        "RelationshipType": 'skip',
        "SequenceName": 'skip',
        "SequenceVariant": 'skip',
        "SmallestImagePixelValue": 'skip',
        "SpecificCharacterSet": 'skip',
        "StudyDate": 'skip',
        "StudyDescription": 'skip',
        "StudyID": 'skip',
        "StudyTime": 'skip',
        "TextValue": 'skip',
        "TriggerTime": 'custom',
        "ValueType": 'skip',
        "VerificationFlag": 'skip',
        "WindowCenter": 'skip',
        "WindowCenterWidthExplanation": 'skip',
        "WindowWidth": 'skip',

        "SAR": 'skip',

    },
    CT: {
        "CTDIPhantomTypeCodeSequence": 'skip',
        "CTDIvol": 'skip',
        "DataCollectionCenterPatient": 'skip',
        "EstimatedDoseSaving": 'skip',
        "Exposure": 'skip',
        "ExposureTime": 'skip',
        "IrradiationEventUID": 'skip',
        "ReconstructionTargetCenterPatient": 'skip',
    },
    PT: {
        "ActualFrameDuration": 'skip',
        "DoseCalibrationFactor": 'skip',
        "FrameReferenceTime": 'skip',
        "ImagePositionPatient": 'skip',
        "LargestImagePixelValue": 'skip',
        "NumberOfTimeSlices ": 'custom',

        "RadiopharmaceuticalInformationSequence": 'custom',
        "RescaleIntercept": 'skip',
        "RescaleSlope": 'skip',
        "ScatterFractionFactor": 'skip',
        "SmallestImagePixelValue": 'skip',
        "WindowCenter": 'skip',
        "WindowWidth": 'skip',

        //"InstanceNumber": 'skip',
    }
}



db.init(function(err) {
    if(err) throw err; //will crash

    async.eachOf(keywords, function(keys, modality, cb_m){
        async.eachOf(keys, function(handler, key, cb_k) {
            let skip = handler === 'skip' ? true : false;
            let kk = {
                key: key,
                modality: modality,
                skip: skip,
                custom: !skip
            }
            db.QCkeyword.findOneAndUpdate({key: kk.key, modality: kk.modality}, {skip: kk.skip, custom:kk.custom}, {upsert:true}, function(err, doc){
                if (err) return cb_k(err);
                cb_k()
            });
        }, function(err){
            if(err) return cb_m(err);
            console.log(`Done with Modality ${modality}`);
            cb_m();
        })
    }, function(err){
        console.log("Done with bootstrapping keys");
    });
})
