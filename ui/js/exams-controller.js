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
        $scope.can_qc = false;
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
            CT: {display: false, count: 0},
            PT: {display: false, count: 0}
        };

        $scope.showExams = true;

        $scope.toggleExamShow = function() {
            $scope.showExams = !$scope.showExams;

            angular.forEach($scope.org, function(research, iibisid) {
                angular.forEach(research, function(modality) {
                    modality.showme = $scope.showExams;
                });
            });
        }

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

        $scope.subj_sortoptions = {
            '-StudyTimestamp': 'Exam Date',
            'subject' : 'Subject ID'
        };

        $scope.selected_subjects = [];
        $scope.subject_filter = "";

        $scope.loading_exam = false;

        $scope.$on("ExamDeletion", function(evt, exam) {
            console.log("Exam deleted!");
            console.log(exam);
            var research = $scope.org[exam.research_id.IIBISID][exam.research_id._id];
            angular.forEach(research.exams, function(_exam) {
                if(_exam._id == exam._id) {
                    console.log("Found it, clearing!");
                    _exam.qc = undefined;
                }
            });
        });

        $scope.select = function(modality, exam) {

            $scope.selected = null;
            $scope.loading_exam = true;

            $scope.subject_filter = "";
            $scope.selected_subjects = [];
            $scope.subject_exams = {};

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


            $scope.can_qc = false;
            $http.get(appconf.api+'/self/can/'+research.IIBISID+'/qc')
                .then(function(res) {
                    console.log(res);
                    if(res.data.result) {
                        $scope.can_qc = true;
                    }
                }, function(err) {
                    toaster.error(err);
                })

            $http.get(appconf.api+'/research/'+research._id, {params: {
                    skip: 0,
                    limit: 5000000,
                    where: where,
                }})
                .then(function(res) {

                    console.log("back from the api");

                    res.data.template_map = {};

                    angular.forEach(res.data.templates, function(t) {
                        t.bgcolor = newColor();
                        angular.forEach(t.series, function(ts) {
                            res.data.template_map[ts._id] = {
                                StudyTimestamp: t.StudyTimestamp,
                                series_desc: ts.series_desc,
                                SeriesNumber: ts.SeriesNumber,
                                bgcolor : t.bgcolor
                            };
                        });
                    });


                    angular.forEach(res.data.exams, function(e) {
                        if($scope.selected_subjects.indexOf(e.subject) < 0) {
                            $scope.selected_subjects.push(e.subject);
                            $scope.subject_exams[e.subject] = [e]
                        } else {
                            $scope.subject_exams[e.subject].push(e);
                        }
                    });

                    $scope.loading_exam = false;
                    $scope.selected = res.data;
                    console.log($scope.selected)

                    handle_scroll();

                    function handle_scroll() {
                        if (!exam) return;
                        console.log("handling scroll " + exam._id);
                        var pos = $('#' + exam._id).position();
                        if (pos) {
                            window.scroll({
                                top: pos.top - 150,
                                left: 0,
                                behavior: 'smooth'
                            });
                        } else {
                            //item not loaded yet.. wait
                            $timeout(handle_scroll, 300, false);
                        }
                    }
                }, function(err) {
                    console.log('new API err: '+err);
                });
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
            sort: 'dateup',
            subj_sort: '-StudyTimestamp',
        };

        $scope.changerange($scope.search.recentrange);

        $scope.show_iibis = function(iibisid, researches) {
            for(var research_id in researches){
                var research = researches[research_id];
                if($scope.show_modality(iibisid, research.research.Modality, research.research.radio_tracer, research.exams)) return true;
            }
            return false;
        };

        $scope.show_modality = function(iibisid, modality, radio_tracer, exams) {
            if(!$scope.modalities[modality].display) return false;
            if(!$scope.research_filter) return true;
            if(~iibisid.toLowerCase().indexOf($scope.research_filter.toLowerCase())) return true;
            if(~modality.toLowerCase().indexOf($scope.research_filter.toLowerCase())) return true;
            //console.log(radio_tracer);
            if(radio_tracer && ~radio_tracer.toLowerCase().indexOf($scope.research_filter.toLowerCase())) return true;
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
            let total = exam.qc.series_failed + exam.qc.series_passed + exam.qc.series_passed_warning;
            tooltip += '<br>Missing Images: '+ exam.qc.total_missing_images;
            tooltip += '<br>Series Failed: '+ ((exam.qc.series_failed / total) * 100).toFixed(1) + '\%';
            tooltip += '<br>Series Passed w/Warnings: '+ ((exam.qc.series_passed_warning / total) * 100).toFixed(1) + '\%';
            tooltip += '<br>Images w/Errors: '+ ((exam.qc.images_errored / exam.qc.image_count) * 100).toFixed(1) + '\%';
            tooltip += '<br>Average # of Errors/Image: ' + (exam.qc.fields_errored / exam.qc.image_count).toFixed(2);
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
                            SeriesNumber: series.SeriesNumber,
                            bgcolor : template.bgcolor,
                            converted_to_template : template.converted_to_template};

                    }
                }
            }
        };


        $scope.QCalert = function(research,qc_type) {
            var alert = `Please confirm that you want to ReQC ${qc_type} series under 
            IIBISID: ${research.IIBISID}
            Modality: ${research.Modality}
            Station Name: ${research.StationName}`;
            if (research.radio_tracer) {alert = `${alert}
            Radio tracer: ${research.radio_tracer}`};
            var r = confirm(alert);
            if (r == true) {
                if (qc_type=="all") {
                    console.log("ReQc-ing all!");
                    reqcallexams(research._id);
                }
                else if (qc_type=="failed"){
                    console.log("ReQc-ing failures!");
                    reqcfailedexams(research._id);
                }
            } else {
              console.log("ReQc canceled")
            }
        }

        reqcallexams = function(research_id) {
            console.log("reQC research with id "+research_id)
            $http.post(appconf.api+'/research/reqcall/'+research_id) //{_id:$scope.selected._detail._id})
                .then(function(res) {
                    toaster.success(res.data.message);
                }, $scope.toast_error);
        }

        reqcfailedexams = function(research_id) {
            console.log("reQC research with id "+research_id)
            $http.post(appconf.api+'/research/reqcfailed/'+research_id) //{_id:$scope.selected._detail._id})
                .then(function(res) {
                    toaster.success(res.data.message);
                }, $scope.toast_error);
        }

        $scope.availableColors = [
            "rgb(192,231,243,0.5)", "rgb(198,198,255,0.5)","rgb(255,200,200,0.5)","rgb(244,202,214,0.5)","rgb(255,168,255,0.5)","rgb(220,237,234,0.5)","rgb(239,205,248,0.5)"
        ];

        $scope.takenColors = [];

        newColor = function (){
            if($scope.availableColors.length) {
                return $scope.availableColors.shift()

            } else { //make a new random pastel if the above 7 are taken
                var r = (Math.round(Math.random()* 127) + 127);
                var g = (Math.round(Math.random()* 127) + 127);
                var b = (Math.round(Math.random()* 127) + 127);
                return 'rgb(' + r + ', ' + g + ', ' + b + ', 0.5)';
            }

        }

    });



