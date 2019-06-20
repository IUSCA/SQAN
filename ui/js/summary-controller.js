app.controller('SummaryController',
function($scope, appconf, toaster, $http, $window, $sce, $filter, $q, serverconf) {
    $scope.$parent.active_menu = "rsummary";
    $scope.researches = [];
    $scope.research_detail = {};
    $scope.research_id = '';
    $scope.research = {
        selected: ''
    };
    $scope.subfilter = '';
    $scope.seriesfilter = '';
    $scope.showfull = false;

    $scope.loading = true;
    $scope.transpose = false;

    $scope.toggle = {};
    $scope.toggle.switch = false;

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

            //console.log($scope.researches);
            //console.log(res.data);
            $scope.research.selected = $scope.researches[0];
            console.log($scope.research.selected)
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
        tooltip += '<br>StudyTime: '+$filter('date')(series.exam_id.StudyTimestamp, 'short','-0400');
        if(series.qc === undefined) {
            tooltip += '<br>QC Details not available';
            return tooltip;
        }
        tooltip += '<br>Images: '+series.qc.series_image_count;
        if(series.qc.errors.length > 0) {
            tooltip += '<br>Errors: '+series.qc.series_fields_errored;
        }
        if(series.qc.notemps > 0) {
            tooltip += '<br>Missing Templates: '+series.qc.notemps;
        }
        return tooltip;
    }

    $scope.getIIBIS = function() {
        var url = appconf.api+'/iibis/'+$scope.research.selected.id;
        //console.log(url);
        $http.get(url)
            .then(function(res) {
                //console.log(res);
                $scope.research_detail = res.data[0];
            }, $scope.toast_error);
    };

    $scope.exportJSON = "";

    $scope.getSummary = function() {

        $scope.loading = true;
        $scope.summary = {};
        $scope.subjects = [];
        $scope.subfilter = '';
        $scope.seriesfilter = '';
        $scope.getIIBIS();
        angular.forEach($scope.research.selected.studies, function(s){
            //console.log(s);
            $http.get(appconf.api+'/research/summary/'+s._id)
                .then(function(res) {
                    //console.log(s);
                    var label = s.Modality;
                    if(s.radio_tracer !== null){
                        label += ' - ' + s.radio_tracer;
                    }

                    $scope.summary[label] = res.data;
                    //console.log(res.data);
                    res.data.subjects.forEach(function(k){
                        if($scope.subjects.indexOf(k) < 0){
                            $scope.subjects.push(k);
                        }
                    });
                    $scope.loading = false;
                    $scope.exportJSON = encodeURIComponent(JSON.stringify($scope.export()));

                }, $scope.toast_error);
        });

        console.log($scope.subjects);
        console.log($scope.summary);

    };



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

});


