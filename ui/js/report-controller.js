app.controller('ReportController',
    function($scope, appconf, toaster, $http, $window, $sce, $filter, $q, serverconf) {
        $scope.$parent.active_menu = "report";
        $scope.researches = [];
        $scope.subject_timestamps = {};
        $scope.research_detail = {};
        $scope.research_id = '';
        $scope.research = {
            selected: ''
        };
        $scope.subfilter = '';
        $scope.seriesfilter = '';
        $scope.showfull = false;

        $scope.loading = true;
        $scope.report = {};

        $scope.form = {
            selected_keywords: []
        };

        $scope.table_keywords = [];

        $scope.summary_cols = ['iibis','StationName','subject','StudyTimestamp','ManufacturerModelName','SoftwareVersions'];

        $http.get(appconf.api+'/research')
            .then(function(res) {
                //$scope.researches = res.data;
                var res_temp = {};
                //group by IIBISID
                angular.forEach(res.data, function(r){
                    if (!(r.IIBISID in res_temp)){
                        res_temp[r.IIBISID] = [r];
                    } else {
                        res_temp[r.IIBISID].push(r);
                    }
                });

                angular.forEach(res_temp, function(v, k){
                    $scope.researches.push({id: k, studies: v})
                });
            }, $scope.toast_error);


        $scope.trustAsHtml = function(value) {
            return $sce.trustAsHtml(value);
        };

        $scope.examTime = function (exam) {
            if(exam[Object.keys(exam)[0]].exam_id === undefined) return '';
            return exam[Object.keys(exam)[0]].exam_id.StudyTimestamp;
        };

        // $scope.makeTooltip = function(subject, series) {
        //     if(series === undefined) {
        //         return 'Series not included in this exam';
        //     }
        //
        //     var tooltip = "Subject: "+subject;
        //     tooltip += '<br>StudyTime: '+$filter('date')(series.exam_id.StudyTimestamp, 'short','-0400');
        //     if(series.qc === undefined) {
        //         tooltip += '<br>QC Details not available';
        //         return tooltip;
        //     }
        //     tooltip += '<br>Images: '+series.qc.series_image_count;
        //     if(series.qc.errors.length > 0) {
        //         tooltip += '<br>Errors: '+series.qc.series_fields_errored;
        //     }
        //     if(series.qc.notemps > 0) {
        //         tooltip += '<br>Missing Templates: '+series.qc.notemps;
        //     }
        //     return tooltip;
        // }
        //
        // $scope.getReport = function() {
        //     var url = appconf.api+'/iibis/'+$scope.research.selected.id;
        //     //console.log(url);
        //     $http.get(url)
        //         .then(function(res) {
        //             //console.log(res);
        //             $scope.research_detail = res.data[0];
        //         }, $scope.toast_error);
        // };

        $scope.exportJSON = "";

        $scope.getNumber = function(num) {
            return new Array(num);
        };

        $scope.getReport = function() {

            $scope.loading = true;
            // $scope.showfull = false;
            // $scope.summary = {};
            // $scope.subjects = [];
            // $scope.subfilter = '';
            // $scope.seriesfilter = '';
            // $scope.getIIBIS();
            // $scope.subject_timestamps = {};
            angular.forEach($scope.research.selected.studies, function(s){
                $http.post(appconf.api+'/research/report/'+s.IIBISID, {keywords: $scope.form.selected_keywords})
                    .then(function(res) {
                        $scope.report = res.data;
                        $scope.table_keywords = res.data[Object.keys(res.data)[0]].keywords;
                        console.log(res.data);
                        // var label = s.Modality;
                        // if(s.radio_tracer !== null){
                        //     label += ' - ' + s.radio_tracer;
                        // }
                        //
                        // $scope.summary[label] = res.data;
                        // res.data.subjects.forEach(function(k){
                        //     if($scope.subjects.indexOf(k) < 0){
                        //         $scope.subjects.push(k);
                        //     }
                        //     res.data.exams[k].forEach(function(subj_exam){
                        //         if(subj_exam[Object.keys(subj_exam)[0]] === undefined) return;
                        //         let ts = subj_exam[Object.keys(subj_exam)[0]].exam_id.StudyTimestamp;
                        //         $scope.subject_timestamps[k] = $scope.subject_timestamps[k] || {};
                        //         $scope.subject_timestamps[k][ts] = $scope.subject_timestamps[k][ts] || {max: 1};
                        //         ($scope.subject_timestamps[k][ts][label] = $scope.subject_timestamps[k][ts][label] || []).push(subj_exam);
                        //         $scope.subject_timestamps[k][ts].max = Math.max($scope.subject_timestamps[k][ts][label].length, $scope.subject_timestamps[k][ts].max);
                        //     });
                        // });
                        $scope.loading = false;
                        // $scope.exportJSON = encodeURIComponent(JSON.stringify($scope.export()));

                    }, $scope.toast_error);
            });
            //
            // console.log($scope.subjects);
            // console.log($scope.summary);

        };

        $scope.download_table_as_csv = function(table_id, filename) {
            // Select rows from table_id
            var rows = document.querySelectorAll('table#' + table_id + ' tr');
            // Construct csv
            var csv = [];
            for (var i = 0; i < rows.length; i++) {
                var row = [], cols = rows[i].querySelectorAll('td, th');
                for (var j = 0; j < cols.length; j++) {
                    // Clean innertext to remove multiple spaces and jumpline (break csv)
                    var data = cols[j].innerText.replace(/(\r\n|\n|\r)/gm, '').replace(/(\s\s)/gm, ' ')
                    // Escape double-quote with double-double-quote (see https://stackoverflow.com/questions/17808511/properly-escape-a-double-quote-in-csv)
                    data = data.replace(/"/g, '""');
                    // Push escaped string
                    row.push('"' + data + '"');
                }
                csv.push(row.join(','));
            }
            var csv_string = csv.join('\n');
            // Download it
            var filename = filename + '.csv';
            var link = document.createElement('a');
            link.style.display = 'none';
            link.setAttribute('target', '_blank');
            link.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv_string));
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }



        $scope.export = function() {
            var data = [{"modality":"modality","series":"series"}];
            //console.log($scope.summary);
            var mods = Object.keys($scope.summary);
            mods.forEach(function(mod){
                var res = $scope.summary[mod];
                res.series_desc.forEach(function(sd){
                    var row = {"modality":mod,"series":sd};
                    $scope.subjects.forEach(function(sub){
                        var exams = res.exams[sub];
                        if(exams == undefined) return;
                        exams.forEach(function(ex){
                            var s = ex[sd];
                            if(data[0][sub] == undefined) {
                                data[0][sub] = sub;
                            }
                            var qc1 = 'na';
                            if(s !== undefined && s.qc1_state !== undefined) qc1 = s.qc1_state;
                            if(row[sub] !== undefined) {
                                row[sub] = row[sub] + ',' + qc1;
                            } else {
                                row[sub] = qc1;
                            }

                        });
                    });
                    data.push(row);
                });
            })
            //console.log(data);
            return data;
        };

        $scope.header_keywords = ["AcquisitionDate",
            "AcquisitionDateTime",
            "AcquisitionMatrix",
            "AcquisitionNumber",
            "AcquisitionTime",
            "ActualFrameDuration",
            "AngioFlag",
            "ApplicationHeaderSequence",
            "AttenuationCorrectionMethod",
            "AxialAcceptance",
            "AxialMash",
            "BitsAllocated",
            "BitsStored",
            "BluePaletteColorLookupTableData",
            "BluePaletteColorLookupTableDescriptor",
            "BodyPartExamined",
            "CSAImageHeaderInfo",
            "CSAImageHeaderType",
            "CSAImageHeaderVersion",
            "CSASeriesHeaderInfo",
            "CSASeriesHeaderType",
            "CSASeriesHeaderVersion",
            "CTDIPhantomTypeCodeSequence",
            "CTDIvol",
            "CalciumScoringMassFactorDevice",
            "CardiacNumberOfImages",
            "CollimatorType",
            "Columns",
            "ContentDate",
            "ContentTime",
            "ContrastBolusIngredient",
            "ContrastBolusIngredientConcentration",
            "ContrastBolusTotalDose",
            "ContrastBolusVolume",
            "ConvolutionKernel",
            "CorrectedImage",
            "CountsSource",
            "DataCollectionCenterPatient",
            "DataCollectionDiameter",
            "DateOfLastCalibration",
            "DecayCorrection",
            "DecayFactor",
            "DeidentificationMethod",
            "DeidentificationMethodCodeSequence",
            "DeviceSerialNumber",
            "DistanceSourceToDetector",
            "DistanceSourceToPatient",
            "DoseCalibrationFactor",
            "EchoNumbers",
            "EchoTime",
            "EchoTrainLength",
            "EnergyWindowRangeSequence",
            "EstimatedDoseSaving",
            "Exposure",
            "ExposureModulationType",
            "ExposureTime",
            "FeedPerRotation",
            "FilterType",
            "FlipAngle",
            "FocalSpots",
            "FrameOfReferenceUID",
            "FrameReferenceTime",
            "GantryDetectorTilt",
            "GeneratorPower",
            "GreenPaletteColorLookupTableData",
            "GreenPaletteColorLookupTableDescriptor",
            "HighBit",
            "ImageIndex",
            "ImageOrientationPatient",
            "ImagePositionPatient",
            "ImageType",
            "ImagedNucleus",
            "ImagingFrequency",
            "InPlanePhaseEncodingDirection",
            "InstanceCreationDate",
            "InstanceCreationTime",
            "InstanceNumber",
            "InversionTime",
            "IrradiationEventUID",
            "KVP",
            "LargestImagePixelValue",
            "Laterality",
            "LongitudinalTemporalInformationModified",
            "LossyImageCompression",
            "MEDCOMOOGInfo",
            "MEDCOMOOGType",
            "MEDCOMOOGVersion",
            "MRAcquisitionType",
            "MagneticFieldStrength",
            "Manufacturer",
            "ManufacturerModelName",
            "MedComHistoryInformation",
            "Modality",
            "NominalInterval",
            "NumberOfAverages",
            "NumberOfPhaseEncodingSteps",
            "NumberOfSlices",
            "NumberOfTimeSlices",
            "OsteoOffset",
            "OsteoPhantomNumber",
            "OsteoRegressionLineIntercept",
            "OsteoRegressionLineSlope",
            "PaletteColorLookupTableUID",
            "PatientAge",
            "PatientBirthDate",
            "PatientGantryRelationshipCodeSequence",
            "PatientIdentityRemoved",
            "PatientName",
            "PatientOrientationCodeSequence",
            "PatientPosition",
            "PatientSex",
            "PatientSize",
            "PatientWeight",
            "PercentPhaseFieldOfView",
            "PercentSampling",
            "PhotometricInterpretation",
            "PixelBandwidth",
            "PixelData",
            "PixelRepresentation",
            "PixelSpacing",
            "PositionReferenceIndicator",
            "PrivateCreator",
            "RadiopharmaceuticalInformationSequence",
            "RandomsCorrectionMethod",
            "ReconstructionDiameter",
            "ReconstructionMethod",
            "ReconstructionTargetCenterPatient",
            "RedPaletteColorLookupTableData",
            "RedPaletteColorLookupTableDescriptor",
            "ReferringPhysicianName",
            "RepetitionTime",
            "RescaleIntercept",
            "RescaleSlope",
            "RescaleType",
            "RotationDirection",
            "Rows",
            "SAR",
            "SOPClassUID",
            "SOPInstanceUID",
            "SamplesPerPixel",
            "ScanOptions",
            "ScanningSequence",
            "ScatterCorrectionMethod",
            "ScatterFractionFactor",
            "SequenceName",
            "SequenceVariant",
            "SeriesDate",
            "SeriesDescription",
            "SeriesInstanceUID",
            "SeriesNumber",
            "SeriesTime",
            "SeriesType",
            "SeriesWorkflowStatus",
            "SingleCollimationWidth",
            "SliceLocation",
            "SliceThickness",
            "SmallestImagePixelValue",
            "SoftwareVersions",
            "SpacingBetweenSlices",
            "SpecificCharacterSet",
            "SpiralPitchFactor",
            "StationName",
            "StorageMediaFileSetUID",
            "StudyDate",
            "StudyID",
            "StudyInstanceUID",
            "StudyTime",
            "TableFeedPerRotation",
            "TableHeight",
            "TableSpeed",
            "Target",
            "TimeOfLastCalibration",
            "TotalCollimationWidth",
            "TransmitCoilName",
            "TriggerTime",
            "Units",
            "Unknown Tag & Data",
            "VariableFlipAngleFlag",
            "WindowCenter",
            "WindowCenterWidthExplanation",
            "WindowWidth",
            "XRayTubeCurrent",
            "dBdt",
            "p_AcquisitionMatrix",
            "p_BandwidthPerPixelPhaseEncode",
            "p_Bmatrix",
            "p_Bvalue",
            "p_CoilString",
            "p_DiffusionDirectionality",
            "p_DiffusionGradientDirection",
            "p_FMRIStimulInfo",
            "p_FMRIStimulLevel",
            "p_FieldOfView",
            "p_FlowCompensation",
            "p_GradientMode",
            "p_HeaderType",
            "p_HeaderType_51",
            "p_HeaderVersion",
            "p_HeaderVersion_51",
            "p_ImaAbsTablePosition",
            "p_ImaRelTablePosition",
            "p_ImageType",
            "p_MeasDuration",
            "p_NumberOfImagesInMosaic",
            "p_PATModeText",
            "p_PositivePCSDirections",
            "p_RBMocoRot",
            "p_RBMocoTrans",
            "p_RealDwellTime",
            "p_RelTablePosition",
            "p_ScanOptions1",
            "p_ScanOptions2",
            "p_SequenceMask",
            "p_SliceMeasurementDuration",
            "p_SliceOrientation",
            "p_SlicePosition",
            "p_SlicePositionPCS",
            "p_SliceResolution",
            "p_SliceThickness",
            "p_TablePositionOrigin",
            "p_TimeAfterStart",
            "qc_AcquisitionTimestamp",
            "qc_ContentTimestamp",
            "qc_InstanceCreationTimestamp",
            "qc_PatientAge",
            "qc_PixelSpacingMax",
            "qc_PixelSpacingMin",
            "qc_SeriesTimestamp",
            "qc_StudyTimestamp",
            "qc_WindowCenterMax",
            "qc_WindowCenterMin",
            "qc_WindowWidthMax",
            "qc_WindowWidthMin",
            "qc_esindex",
            "qc_iibisid",
            "qc_istemplate",
            "qc_series_desc",
            "qc_series_desc_version",
            "qc_subject"];

    });


