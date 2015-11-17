'use strict';

app.controller('HeaderController', ['$scope', 'appconf', '$route', 'toaster', '$http', 'jwtHelper', 'serverconf', 'menu',
function($scope, appconf, $route, toaster, $http, jwtHelper, serverconf, menu) {
    $scope.title = appconf.title;
    serverconf.then(function(_c) { $scope.serverconf = _c; });
    $scope.menu = menu;
}]);

app.controller('AboutController', ['$scope', 'appconf', 'toaster', '$http', 'jwtHelper', '$location', 'serverconf', 'scaMessage',
function($scope, appconf, toaster, $http, jwtHelper,  $location, serverconf, scaMessage) {
    $scope.appconf = appconf;
    scaMessage.show(toaster);
    serverconf.then(function(_serverconf) { $scope.serverconf = _serverconf; });

    var jwt = localStorage.getItem(appconf.jwt_id);
    if(jwt) {
        $scope.user = jwtHelper.decodeToken(jwt);
    }
}]);

app.controller('RecentController', ['$scope', 'appconf', 'toaster', '$http', 'jwtHelper', '$location', 'serverconf', 'scaMessage', '$anchorScroll', '$document',
function($scope, appconf, toaster, $http, jwtHelper, $location, serverconf, scaMessage, $anchorScroll, $document) {
    $scope.appconf = appconf;
    scaMessage.show(toaster);

    serverconf.then(function(_serverconf) { $scope.serverconf = _serverconf; });
    //menu.then(function(_menu) { $scope.menu = _menu; });

    var jwt = localStorage.getItem(appconf.jwt_id);
    if(jwt) {
        $scope.user = jwtHelper.decodeToken(jwt);
    }

    $http.get(appconf.api+'/study/query', {params: {
        skip: 0, 
        limit: 600
    }})
    .then(function(res) {
        var iibisids = {};
        res.data.iibisids.forEach(function(research) {
            iibisids[research._id] = research;
        });
       
        //serises catalog (organized under Modality)
        var serieses = res.data.serieses;

        //organize study under iibisid / modality / subject / series / study(#series_number)
        $scope.iibisids = {};
        $scope.study_count = 0;
        res.data.studies.forEach(function(study) {
            $scope.study_count++;
            
            var research_detail = iibisids[study.research_id];
            var research = $scope.iibisids[research_detail.IIBISID];
            if(research === undefined) {
                research = {
                    //_detail: iibisids[study.research_id], (stored under modality)
                    modalities: {},
                };
                $scope.iibisids[research_detail.IIBISID] = research;
            }

            var modality_id = research_detail.Modality+"."+research_detail.StationName+"."+research_detail.radio_tracer;
            //console.log(modality_id);
            var modality = research.modalities[modality_id];
            if(modality === undefined) {
                modality = {
                    _detail: iibisids[study.research_id],
                    subjects: {}, 
                    template: { serieses: {} }, 
                };
                research.modalities[modality_id] = modality;
            }

            var subject = modality.subjects[study.subject];
            if(subject === undefined) {
                subject = {
                    serieses: {}
                };
                modality.subjects[study.subject] = subject;
            }

            var series = subject.serieses[study.series_desc];
            if(series === undefined) {
                series = {
                    _detail: serieses[research_detail.Modality][study.series_desc],
                    series_desc: study.series_desc, 
                    studies: {}
                };
                subject.serieses[study.series_desc] = series;
            }
            series.studies[study._id] = study;
        });

        //count number of status for each subject
        //console.dir($scope.iibisids);
        for(var iibisid in $scope.iibisids) {
            var research = $scope.iibisids[iibisid];
            for(var modality_id in research.modalities) {
                var modality = research.modalities[modality_id];
                for(var subject_id in modality.subjects) {
                    var subject = modality.subjects[subject_id];
                    
                    subject.non_qced = 0; 
                    subject.oks = 0;
                    subject.errors = 0;
                    subject.warnings = 0;
                    subject.notemps = 0;
                    for(var series_desc in subject.serieses) {
                        var series = subject.serieses[series_desc];
                        var series_detail = serieses[modality._detail.Modality][series_desc];
                        if(series_detail.excluded) continue;
                        for(var study_id in series.studies) {
                            var study = series.studies[study_id];
                            if(study.qc) {
                                //decide the overall status(with error>warning>notemp precedence) for each study and count that.. 
                                if(study.qc.errors && study.qc.errors.length > 0) {
                                    subject.errors++; 
                                } else if (study.qc.warnings && study.qc.warnings.length > 0) {
                                    subject.warnings++; 
                                } else if (study.qc.notemps > 0) {
                                    subject.notemps++; 
                                } else subject.oks++;
                            } else {
                                subject.non_qced++;
                            }
                        }
                    }
                }
            }
        }
        
        //organize templates as well.
        res.data.templates.forEach(function(template) {
            var research_detail = iibisids[template.research_id];
            var research = $scope.iibisids[research_detail.IIBISID];
            var modality_id = research_detail.Modality+"."+research_detail.StationName+"."+research_detail.radio_tracer;
            var modality = research.modalities[modality_id];
            var series = modality.template.serieses[template.series_desc];
            if(series === undefined) {
                series = {
                    //_detail: subject.serieses[template.series_desc],
                    series_desc: template.series_desc,
                    templates: {}
                };
                modality.template.serieses[template.series_desc] = series;
            }
            series.templates[template._id] = template;
        });
        
        //create uid for subject 
        for(var iibisid in $scope.iibisids) {
            var research = $scope.iibisids[iibisid];
            for(var modality_id in research.modalities) {
                var modality = research.modalities[modality_id];
                for(var subject_id in modality.subjects) {
                    var subject = modality.subjects[subject_id];
                    subject.uid = iibisid+modality_id+subject_id;
                }
            }
        }

        //debug
        //console.log("$scope.iibisids dump");
        //console.dir($scope.iibisids);
    });

    $document.on('scroll', function() {
        if(window.scrollY < 100) {
            if($scope.content_affix) $scope.$apply(function() {
                $scope.content_affix = false;
            });
        } else {
            if(!$scope.content_affix) $scope.$apply(function() {
                $scope.content_affix = true;
            });

            if(window.scrollY > document.body.clientHeight - window.innerHeight - 200) {
                //affix, but I need to raise the bottom
                console.log("TODO - raise bottom!");
            }
        }
        
        //find first subject displayed
        var it = null;
        $(".subject, .template").each(function(id, subject) {
            if(it) return; //already found
            if($(subject).offset().top >= window.scrollY) {
                it = subject;
            }
        });
        //and update inview
        //console.log(it);
        if(it && $scope.inview_id != it.id) $scope.$apply(function() {
            $scope.inview_id = it.id;
        });
    });

    $scope.openstudy = function(study_id) {
        $location.path("/study/"+study_id);
    }
    $scope.opentemplate = function(id) {
        $location.path("/template/"+id);
    }
    $scope.scrollto = function(id) {
        $anchorScroll(id);
    }
}]);

app.controller('StudyController', ['$scope', 'appconf', 'toaster', '$http', 'jwtHelper', '$location', 'serverconf', '$routeParams', 'scaMessage',
function($scope, appconf, toaster, $http, jwtHelper,  $location, serverconf, $routeParams, scaMessage) {
    $scope.appconf = appconf;
    scaMessage.show(toaster);
    //menu.then(function(_menu) { $scope.menu = _menu; });
    serverconf.then(function(_serverconf) { $scope.serverconf = _serverconf; });

    var jwt = localStorage.getItem(appconf.jwt_id);
    if(jwt) {
        $scope.user = jwtHelper.decodeToken(jwt);
    }

    $http.get(appconf.api+'/study/id/'+$routeParams.studyid)
    .then(function(res) {
        $scope.data = res.data;
        if($scope.data.images) {
            $scope.data.images.forEach(computeColor);
        }
    });

    function computeColor(image) {
        //TODO - what about non-qced? 
        var h = 0; 
        var s = "0%"; //saturation (default to gray)
        var l = "50%"; //light
        if(image.errors > 0) {
            //error - red
            h = 0; 
            var _s = 50-image.errors;
            if(_s < 0) _l = 0;
            s = _s+"%";
        } else if(image.warnings > 0) {
            //warning - yello
            h = 60; 
            var _s = 50-image.warnings;
            if(_s < 0) _l = 0;
            s = _s+"%";
        } else if(image.notemp) {
            //no temp - dark blue
            h = 195;
            s = "100%";
            l = "36%";
        } else {
            //ok - green
            h = 120; 
            s = "50%";
        }
        image.color = "hsl("+h+","+s+","+l+")";
    }


    $scope.load_image = function(image) {
        if($scope.active_image == image) {
            return $scope.active_image = null;
        }
        $scope.active_image = image;
        $http.get(appconf.api+'/image/'+image._id)
        .then(function(res) {
            $scope.image_detail = res.data;

            //move any issues with specifc k to image_errors/warnings
            $scope.image_errors = {};
            $scope.image_warnings = {};
            $scope.other_errors = [];
            $scope.other_warnings = [];
            if(res.data.qc) {
                res.data.qc.errors.forEach(function(error) {
                    if(error.k) $scope.image_errors[error.k] = error;
                    else $scope.other_errors.push(error);
                });
                res.data.qc.warnings.forEach(function(warning) {
                    if(warning.k) $scope.image_warning[warning.k] = warning;
                    else $scope.other_warning.push(warning);
                });
            }
        
            //if there is no error to show, show all headers by default
            if($scope.image_detail.qc.errors == 0 && $scope.image_detail.qc.warnings == 0) {
                $scope.show_all_headers = true;
            } else {
                $scope.show_all_headers = false;
            }
        });
    }
    $scope.showallheaders = function() {
        $scope.show_all_headers = true;
    }
    $scope.opentemplate = function(id) {
        $location.path("/template/"+id);
    }
}]);

app.controller('TemplateController', ['$scope', 'appconf', 'toaster', '$http', 'jwtHelper', '$location', 'serverconf', '$routeParams', 'scaMessage',
function($scope, appconf, toaster, $http, jwtHelper, $location, serverconf, $routeParams, scaMessage) {
    $scope.appconf = appconf;
    scaMessage.show(toaster);
    //menu.then(function(_menu) { $scope.menu = _menu; });
    serverconf.then(function(_serverconf) { $scope.serverconf = _serverconf; });

    var jwt = localStorage.getItem(appconf.jwt_id);
    if(jwt) {
        $scope.user = jwtHelper.decodeToken(jwt);
    }

    $http.get(appconf.api+'/template/head/'+$routeParams.templateid)
    .then(function(res) {
        $scope.data = res.data;
    });

    $scope.load_template = function(template) {
        $scope.active_template = template;
        $http.get(appconf.api+'/template/inst/'+template._id)
        .then(function(res) {
            $scope.image_detail = res.data;
        });
    }

}]);
