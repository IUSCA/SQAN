app.controller('ResearchController', 
function($scope, appconf, toaster, $http, $location, serverconf, $document, $window, $routeParams, $route) {
    $scope.appconf = appconf;
    $scope.$parent.active_menu = "research";
    serverconf.then(function(_serverconf) { $scope.serverconf = _serverconf; });

    $scope.selected = null;

    //unlike all other views, all exam can contain a lot of exams.. so it makes sense to display it wide mode
    $scope.view_mode = "wide";

    /*
    var lastRoute = $route.current;
    $scope.$on('$locationChangeSuccess', function(event) {
        $routeParams = $route.current.params;
        if($route.current.$$route.controller === 'ResearchController') {
            $route.current = lastRoute;
        }
    });
    */

    $scope.select = function(research) {
        $scope.selected = research;
        $location.update_path("/research/"+research._id); 
        
        //load research detail
        console.log("loading series with research_id:"+research._id);
        $scope.modality = null;
        $scope.loading = true;
        $http.get(appconf.api+'/series/query', {params: {
            //limit: $scope.query_limit,
            limit: 5000000,
            where: {
                research_id: research._id
                //show all for recent page
                //deprecated_by: {$exists: false}, //only look for the latest series inside series_desc
                //isexcluded: false, 
            },
        }})
        .then(function(res) {
            $scope.loading = false;

            //find modality that user wants to see
            for(var research_id in res.data) {
                var modalities = res.data[research_id];
                for(var modality_id in modalities) {
                    var modality = modalities[modality_id];
                    if(modality._detail._id == research._id) $scope.modality = modality;
                    
                    //while at it, create a catalog of all serieses
                    for(var subject in modality.subjects) {
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
            window.scrollTo(0,0); 

            if(modality) {
                //now bind to this modality
                $scope.event_bind({
                    ex: "dicom.series",
                    key: modality._detail._id+".#"
                });
            } else {
                //probably empty modality
            }
        }, function(res) {
            $scope.loading = false;
            $scope.toast_error(res);
        });
    }

    //load all research entries
    $scope.loading_research = true;
    $http.get(appconf.api+'/research')
    .then(function(res) {
        $scope.loading_research = false;
        
        //organize records into IIBISID / (Modality+StationName+Radio Tracer)
        $scope.research_count = res.data.length;
        $scope.iibisids = {};
        res.data.forEach(function(rec) {
            if(!$scope.iibisids[rec.IIBISID]) $scope.iibisids[rec.IIBISID] = [];
            $scope.iibisids[rec.IIBISID].push(rec);

            //select user specified research or first one if not specified
            if($routeParams.researchid) {
                if(rec._id == $routeParams.researchid) $scope.select(rec); 
            } else {
                if(!$scope.selected) $scope.select(rec);
            }
        });
    }, $scope.toast_error);

    /*
    //load all researches that user has access to
    researches.getAll().then(function(researches) {
        $scope.researches = researches;
        //load_series();
    });
    */

    /* TODO I should use websocket feed through event service
    $scope.$on("exam_invalidated", function(event, msg) {
        load_series();
    });
    */

    //used to apply filter for /research
    $scope.show_researches = function(researches) {
        for(var i in researches) {
            var research = researches[i]; 
            return $scope.show_research(research);
        }
        return false;
    }
    $scope.show_research = function(research) {
        if(!$scope.research_filter) return true; 
        if(~research.IIBISID.toLowerCase().indexOf($scope.research_filter)) return true;
        if(~research.StationName.toLowerCase().indexOf($scope.research_filter)) return true;
        if(~research.Modality.toLowerCase().indexOf($scope.research_filter)) return true;
        if(research.radio_tracer && ~research.radio_tracer.toLowerCase().indexOf($scope.research_filter)) return true;
        return false;
    }

    $scope.$watch("research_filter", function(filter) {
        //hide selection if the selected research gets filtered out
        if(!$scope.selected) return;
        if(!$scope.show_research($scope.selected)) {
            $scope.selected = null;
        }
        /*
        if(!filter) {
            $scope.researches_filtered = $scope.researches;
            return;
        }
        filter = filter.toLowerCase();
        var result = {};
        for(var id in $scope.researches) {
            var value = $scope.researches[id];
            if(~id.toLowerCase().indexOf(filter)) {
                result[id] = value;
                continue;
            }

            //filter sub recoeds
            var sub_result = [];
            value.forEach(function(sub) {
                if(~sub.Modality.toLowerCase().indexOf(filter) || 
                    ~sub.StationName.toLowerCase().indexOf(filter) ||
                    (sub.radio_tracer && ~sub.radio_tracer.toLowerCase().indexOf(filter))
                ) {
                    sub_result.push(sub);
                }           
            });
            if(sub_result.length) {
                result[id] = sub_result;
            }
        }
        $scope.researches_filtered = result;
        */
    });
});