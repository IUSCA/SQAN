app.controller('SummaryController',
function($scope, appconf, toaster, $http, $window, $sce, $filter, serverconf) {
    $scope.$parent.active_menu = "rsummary";
    $scope.researches = [];
    $scope.research_detail = {};
    $scope.research_id = '';
    $scope.research = {
        selected: ''
    };
    $scope.subfilter = '';
    $scope.seriesfilter = '';

    $scope.loading = true;

    $scope.openstudy = function(id) {
        $window.open("#/series/"+id, "study:"+id);
    }

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

            console.log($scope.researches);
            console.log(res.data);
            $scope.research.selected = $scope.researches[0];
            $scope.getSummary();
        }, $scope.toast_error);


    $scope.trustAsHtml = function(value) {
        return $sce.trustAsHtml(value);
    };

    $scope.makeTooltip = function(subject, series) {
        if(series === undefined) {
            return 'Series not included in this exam';
        }

        var tooltip = "Subject: "+subject;
        tooltip += '<br>StudyTime: '+$filter('date')(series.StudyTimestamp, 'short');
        if(series.qc === undefined) {
            tooltip += '<br>QC Details not available';
            return tooltip;
        }
        tooltip += '<br>Images: '+series.qc.image_count;
        if(series.qc.errors.length > 0) {
            tooltip += '<br>Errors: '+series.qc.errors.length;
        }
        if(series.qc.warnings.length > 0) {
            tooltip += '<br>Warnings: '+series.qc.warnings.length;
        }
        if(series.qc.notemps > 0) {
            tooltip += '<br>Missing Templates: '+series.qc.notemps;
        }
        return tooltip;
    }

    $scope.getIIBIS = function() {
        var url = appconf.api+'/iibis/'+$scope.research.selected.id;
        console.log(url);
        $http.get(url)
            .then(function(res) {
                console.log(res);
                $scope.research_detail = res.data[0];
            }, $scope.toast_error);
    };

    $scope.getSummary = function() {

        $scope.loading = true;
        $scope.summary = {};
        $scope.subjects = [];
        $scope.subfilter = '';
        $scope.seriesfilter = '';
        $scope.getIIBIS();
        angular.forEach($scope.research.selected.studies, function(s){
            console.log(s);
            $http.get(appconf.api+'/research/summary/'+s._id)
                .then(function(res) {
                    console.log(s);
                    var label = s.Modality;
                    if(s.radio_tracer !== null){
                        label += ' - ' + s.radio_tracer;
                    }

                    $scope.summary[label] = res.data;
                    console.log(res.data);
                    angular.forEach(res.data.subjects, function(k){
                        if($scope.subjects.indexOf(k) < 0){
                            $scope.subjects.push(k);
                        }
                    });
                    $scope.loading = false;
                }, $scope.toast_error);
        });

        console.dir($scope.subjects);

    };

});


