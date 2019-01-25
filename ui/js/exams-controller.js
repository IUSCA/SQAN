app.controller('ExamsController',
    function($scope, appconf, toaster, $http, $location, serverconf, $document, $window, $routeParams, $timeout, $filter) {
        $scope.appconf = appconf;
        serverconf.then(function(_serverconf) { $scope.serverconf = _serverconf; });

        $scope.selected = null;
        $scope.selected_modality = null;
        $scope.$parent.active_menu = "exams"+$routeParams.level;
        $scope.view_mode = "tall";
        $scope.qc_title = 'Exams';
        $scope.qc_text = 'exams';
        switch($routeParams.level) {
            case "all":
                break;
            case "1":
                pending = 'qc1';
                $scope.qc_title = 'QC1 Pending';
                $scope.qc_text = 'QC1 pending exams';
                break;
            case "2":
                pending = 'qc2';
                $scope.qc_title = 'QC2 Pending';
                $scope.qc_text = 'QC2 pending exams';
                break;
        };
        $scope.show_deprecated = true;
        $scope.serieses_count = 0;
        $scope.modalities = {
            MR: {display: true, count: 0},
            CT: {display: true, count: 0},
            PT: {display: true, count: 0}
        };

        $scope.ranges = {
            30: '30 days',
            60: '60 days',
            90: '90 days',
            'all': 'All Time'
        };

        $scope.sortoptions = {
            'dateup': 'Newest',
            'datedown': 'Oldest',
            'iibis': 'IIBISID'
        };

        $scope.select = function(modality, subjectuid) {
            console.log(modality);
            console.log(subjectuid);

            var where = {};
            var research = modality.research;

            where.research_id = research._id;

            switch($scope.search.recentrange) {
                case "all":
                    break;
                default:
                    var d = new Date();
                    d.setDate(d.getDate() - ($scope.search.recentrange));
                    where.StudyTimestamp = {$gt: d};
            };

            $scope.selected_modality = modality;
            var modality_id = research.Modality+"."+research.StationName+"."+research.radio_tracer;

            //console.log(where);

            $http.get(appconf.api+'/research/'+research._id, {params: {
                    skip: 0,
                    limit: 5000000,
                    where: where,
                }})
                .then(function(res) {
                    console.log('new API response:');
                    console.log(res.data);
                    $scope.selected = res.data;
                }, function(err) {
                    console.log('new API err: '+err);
                });
            
            // $http.get(appconf.api+'/series/query', {params: {
            //         skip: 0,
            //         limit: 5000000,
            //         where: where,
            //     }})
            //     .then(function(res) {
            //         console.log('back from API!!')
            //         console.log(res.data);
            //         $scope.selected = res.data[research.IIBISID][modality_id];
            //
            //         window.scrollTo(0, 0);
            //
            //         // var url = "/qcnew/" + $routeParams.level + "/" + modality.research._id;
            //         // if (subjectuid) url += "/" + subjectuid;
            //         // $location.update_path(url);
            //
            //         handle_scroll();
            //
            //         function handle_scroll() {
            //             if (!subjectuid) return;
            //             console.log("handling scroll " + subjectuid);
            //             var pos = $('#' + research._id + '_' + subjectuid.replace(/\./g, '\\.')).position();
            //             if (pos) {
            //                 window.scroll({
            //                     top: pos.top - 85,
            //                     left: 0,
            //                     behavior: 'smooth'
            //                 });
            //             } else {
            //                 //item not loaded yet.. wait
            //                 $timeout(handle_scroll, 100, false);
            //             }
            //         }
            //
            //         $scope.event_bind({
            //             ex: "dicom.series",
            //             key: research._id + ".#"
            //         });
            //     }, function(err) {
            //         console.log(err);
            //     });
        };


        //construct query

        function load(where) {
            var pending = null;
            switch($routeParams.level) {
                case "all":
                    break;
                case "1":
                    pending = 'qc1';
                    break;
                case "2":
                    pending = 'qc2';
                    break;
            };

            var sortby = {};
            switch($scope.search.sort) {
                case "dateup":
                    sortby.StudyTimestamp = -1;
                    break;
                case "datedown":
                    sortby.StudyTimestamp = 1;
                    break;
                case "iibis":
                    sortby.IIBISID = -1;
                    break
                default:
                    sortby.StudyTimestamp = -1;
            }
            $scope.selected = null;
            $scope.loading_series = true;
            $http.get(appconf.api + '/exam/query', {
                params: {
                    skip: 0,
                    limit: 5000000,
                    where: where,
                    sort: sortby,
                    pending: pending
                }
            })
                .then(function (res) {
                    console.log(res.data);
                    $scope.org = res.data;
                    $scope.loading_series = false;
                }, function (err) {
                    console.log(err);
                });
        };

        $scope.changerange = function(range) {

            $scope.search.recentrange = range;
            var where = {};
            switch(range) {
                case "all":
                    break;
                case "recent":
                default:
                    var d = new Date();
                    d.setDate(d.getDate() - (range));
                    where.StudyTimestamp = {$gt: d};
            }
            where.istemplate = false;

            load(where);
        }

        $scope.changesort = function(sort) {
            console.log(sort);
            $scope.search.sort = sort;
            $scope.changerange($scope.search.recentrange);
        };

        $scope.search = {
            recentrange : (appconf.recent_study_days||30),
            sort: 'dateup'
        };

        $scope.changerange($scope.search.recentrange);

        $scope.show_iibis = function(iibisid, researches) {
            for(var research_id in researches){
                var research = researches[research_id];
                if($scope.show_modality(iibisid, research.research.Modality, research.exams)) return true;
            }
            return false;
        };

        $scope.show_modality = function(iibisid, modality, exams) {
            if(!$scope.modalities[modality].display) return false;
            if(!$scope.research_filter) return true;
            if(~iibisid.toLowerCase().indexOf($scope.research_filter.toLowerCase())) return true;
            if(~modality.toLowerCase().indexOf($scope.research_filter.toLowerCase())) return true;
            for(var exam in exams) {
                if(~exams[exam].subject.toLowerCase().indexOf($scope.research_filter.toLowerCase())) return true;
            }
            return false;
        };

        $scope.makeTooltip = function(exam) {

            var tooltip = "Subject: "+exam.subject;
            tooltip += '<br>StudyTime: '+$filter('date')(exam.StudyTimestamp, 'short');
            if(exam.qc === undefined) {
                tooltip += '<br>QC Details not available';
                return tooltip;
            }
            tooltip += '<br>Series Failed: '+ ((exam.qc.series_failed / exam.qc.qced_series) * 100) + '\%';
            tooltip += '<br>Images w/Errors: '+ ((exam.qc.images_errored / exam.qc.image_count) * 100) + '\%';
            tooltip += '<br>Average # of Errors/Image: ' + (exam.qc.fields_errored / exam.qc.image_count);
            tooltip += '<br>Series Missing: '+exam.qc.series_missing.length;
            tooltip += '<br>Series w/No Template: '+exam.qc.series_no_template.length;
            return tooltip;
        };

        $scope.templateLookup = function(t_id) {
            for(var template of $scope.selected.templates) {
                for(var series of template.series) {
                    if(series._id == t_id) {
                        return {
                            StudyTimestamp: template.StudyTimestamp,
                            series_desc: series.series_desc,
                            SeriesNumber: series.SeriesNumber};
                    }
                }
            }
        };

        $scope.reqcallexams = function(research_id) {
            console.log("reQC research with id "+research_id)
            $http.post(appconf.api+'/research/reqcall/'+research_id) //{_id:$scope.selected._detail._id})
                .then(function(res) {
                    toaster.success(res.data.message);
                }, $scope.toast_error);
        }

        $scope.reqcfailedexams = function(research_id) {
            console.log("reQC research with id "+research_id)
            $http.post(appconf.api+'/research/reqcfailed/'+research_id) //{_id:$scope.selected._detail._id})
                .then(function(res) {
                    toaster.success(res.data.message);
                }, $scope.toast_error);
        }

    });


    