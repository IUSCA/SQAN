app.controller('QCController', 
function($scope, appconf, toaster, $http, $location, serverconf, $document, $window, $routeParams, $timeout) {
    $scope.appconf = appconf;
    serverconf.then(function(_serverconf) { $scope.serverconf = _serverconf; });

    $scope.selected = null;
    $scope.$parent.active_menu = "qc"+$routeParams.level;
    $scope.view_mode = "tall";
    $scope.show_deprecated = true;
    $scope.serieses_count = 0;

    $scope.select = function(modality, subjectuid) {
        console.log(modality);
        $scope.selected = modality;
        window.scrollTo(0,0); 

        var url = "/qc/"+$routeParams.level+"/"+modality._detail._id;
        if(subjectuid) url += "/"+subjectuid;
        $location.update_path(url);

        handle_scroll();
        function handle_scroll() {
            if(!subjectuid) return;
            console.log("handling scroll "+subjectuid);
            var pos = $('#'+subjectuid.replace(/\./g, '\\.')).position();
            if(pos) {
                window.scrollTo(0,pos.top-85); 
            } else {
                //item not loaded yet.. wait
                $timeout(handle_scroll, 1000, false);
            }
        }

        $scope.event_bind({
            ex: "dicom.series",
            key: modality._detail._id+".#"
        });
    }

    //construct query
    var where = {};
    switch($routeParams.level) {
    case "all":
        break;
    case "recent":
        var d = new Date();
        d.setDate(d.getDate() - (appconf.recent_study_days||300));
        where.StudyTimestamp = {$gt: d};
        break;
    case "1":
        where.deprecated_by = {$exists: false};
        where.isexcluded = false;
        where.$and  = [
            {qc1_state:{$ne:"autopass"}},
            {qc1_state:{$ne:"accept"}}
        ];
        break;
    case "2":
        where.deprecated_by = {$exists: false};
        where.isexcluded = false;
        where.qc2_state = {$exists: false};
        break;
    default:
        toaster.error("Unknown QC level "+$routeParams.level);
    }

    $scope.recentrange = (appconf.recent_study_days||300);

    $scope.ecount = 0;

    load();
    function load() {
        $scope.loading_series = true;  //TODO: why load series instead of exams???
        $http.get(appconf.api+'/series/query', {params: {
            skip: 0, 
            limit: 5000000,
            where: where,
        }})
        .then(function(res) {
            $scope.org = res.data;
            console.log(res.data);
            $scope.count($scope.org);
            $scope.scan_count = 0;
            $scope.modalities = {};

            //select first modality or selected by user
            for(var iibisid in $scope.org) {
                var modalities = $scope.org[iibisid];
                for(var modality_id in modalities) {
                    var modality = modalities[modality_id];
                    if(!$scope.modalities[modality._detail.Modality]){
                        $scope.modalities[modality._detail.Modality] = {display: true, count: 0}
                    }
                    if($routeParams.researchid) {
                        if(modality._detail._id == $routeParams.researchid) {
                            //selecte first modality under research user specified
                            if(!$scope.selected) $scope.select(modality, $routeParams.subjectid);
                        }
                    } else {
                        if(!$scope.selected) $scope.select(modality);
                    }

                    //while at it, create serieses catalog
                    $scope.serieses = {};
                    for(var subject in modality.subjects) {
                        if (Object.keys(modality.subjects[subject].serieses).length < 1) continue;
                        $scope.scan_count++; //count the number of subjects in each modality in each research series
                        $scope.modalities[modality._detail.Modality].count++;
                        for(var series_desc in modality.subjects[subject].serieses) {

                            var exams = modality.subjects[subject].serieses[series_desc].exams; 
                            for(var exam_id in exams) {
                                exams[exam_id].forEach(function(series) {
                                    $scope.serieses[series._id] = series;
                                }); 
                            }
                        }
                    }
                }
            }
            $scope.serieses_count = Object.keys($scope.serieses).length;
            console.log(Object.keys($scope.serieses));
            $scope.loading_series = false;
        }, $scope.toast_error);
    };

    $scope.moreOne = function(counter) {
        $scope[counter]++;
    };
 
    //these are duplicate of show_XXX for RecentController, but putting this on PageController somehow disables filtering
    //used to apply filtering capability
    $scope.show_iibis = function(iibisid, research) {
        for(var modality_id in research) {
            if($scope.show_modality(iibisid, modality_id, research[modality_id])) return true;
        }
        return false;
    };

    $scope.show_modality = function(iibisid, modality_id, modality) {
        for(var subject_desc in modality.subjects) {
            //console.log(modality);
            if(!$scope.modalities[modality._detail.Modality].display) return false;
            if($scope.show_subject(iibisid, modality_id, subject_desc)) return true;
        }
        return false;
    }

    $scope.show_subject = function(iibisid, modality_id, subject_desc) {
        if(Object.keys($scope.org[iibisid][modality_id].subjects[subject_desc].serieses).length < 1) return false;
        if(!$scope.research_filter) return true;
        if(~iibisid.toLowerCase().indexOf($scope.research_filter)) return true;
        if(~modality_id.toLowerCase().indexOf($scope.research_filter)) return true;
        if(~subject_desc.toLowerCase().indexOf($scope.research_filter)) return true;
        return false;
    }

    $scope.$watch("research_filter", function(filter) {
        //hide selection if the selected research gets filtered out
        if(!$scope.selected) return;
        var _detail = $scope.selected._detail;
        if(!$scope.show_modality(_detail.IIBISID, _detail.modality_id, $scope.selected)) {
            $scope.selected = null;
        }
    });

    $scope.reqc = function() {
        $http.post(appconf.api+'/research/reqc', {_id:$scope.selected._detail._id})
            .then(function(res) {
                toaster.success(res.data.message);
            }, $scope.toast_error);
    }
});