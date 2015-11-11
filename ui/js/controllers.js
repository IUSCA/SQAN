'use strict';

/*
 * Right now, we are going to have a single module for our app which contains
 * all controllers. In the future, we should refactor into multiple modules. When I do, don't forget
 * to add it to app.js's module list
 * */

app.controller('AboutController', ['$scope', 'appconf', 'toaster', '$http', 'jwtHelper', '$location', 'menu', 'serverconf', 'scaMessage',
function($scope, appconf, toaster, $http, jwtHelper,  $location, menu, serverconf, scaMessage) {
    $scope.appconf = appconf;
    scaMessage.show(toaster);
    menu.then(function(_menu) { $scope.menu = _menu; });
    serverconf.then(function(_serverconf) { $scope.serverconf = _serverconf; });
    //todo
}]);

app.controller('RecentController', ['$scope', 'appconf', 'toaster', '$http', 'jwtHelper', '$location', 'menu', 'serverconf', 'scaMessage', '$anchorScroll', '$document',
function($scope, appconf, toaster, $http, jwtHelper, $location, menu, serverconf, scaMessage, $anchorScroll, $document) {
    $scope.appconf = appconf;
    scaMessage.show(toaster);

    serverconf.then(function(_serverconf) { $scope.serverconf = _serverconf; });
    menu.then(function(_menu) { $scope.menu = _menu; });

    $http.get(appconf.api+'/study/query', {params: {
        skip: 0, 
        limit: 600
    }})
    .then(function(res) {
        var iibisids = {};
        res.data.iibisids.forEach(function(research) {
            iibisids[research._id] = research;
        });
        
        /*
        var serieses = {};
        res.data.serieses.forEach(function(series) {
            serieses[series._id] = series;
            //series.research = iibisids[series.research_id];
        });
        */

        //serises catalog (organized under Modality)
        var serieses = res.data.serieses;
        //console.dir($scope.serieses);

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

/*
app.controller('RecentOldController', ['$scope', 'appconf', 'toaster', '$http', 'jwtHelper', '$location', 'menu', 'serverconf',
function($scope, appconf, toaster, $http, jwtHelper, $location, menu, serverconf) {
    menu.then(function(_menu) { $scope.menu = _menu; });
    serverconf.then(function(_serverconf) { $scope.serverconf = _serverconf; });
    $scope.appconf = appconf;

    $http.get(appconf.api+'/study/recent')
    .then(function(res) {

        var iibisids = {};
        res.data.iibisids.forEach(function(research) {
            iibisids[research._id] = research;
        });
        
        var serieses = {};
        res.data.serieses.forEach(function(series) {
            serieses[series._id] = series;
        });

        $scope.iibisids = {};
        $scope.study_count = 0;
        
        //add series/research object references
        res.data.studies.forEach(function(study) {
            $scope.study_count++;
            study.series = serieses[study.series_id];
            
            //organize each study under research / series
            var research = $scope.iibisids[study.series.research_id];
            if(research === undefined) {
                research = {
                    research: iibisids[study.series.research_id],
                    serieses: {}
                };
                $scope.iibisids[study.series.research_id] = research;
            }
            var series = research.serieses[study.series_id];
            if(series === undefined) {
                series = {
                    series: serieses[study.series_id],
                    templates: {},
                    studies: {}
                }
                research.serieses[study.series_id] = series;
            }
            series.studies[study._id] = study;

            //find templates for this series
            res.data.templates.forEach(function(template) {
                if(template.series_id == study.series_id) series.templates[template._id] = template;
            });
        });
    });
    
    $scope.load_study = function(study) {
        //load qc results for each study (just queue request up and let browser take care of it)
        //study.loading = true;
        if(study.images) return; //already loaded
        $http.get(appconf.api+'/study/qc/'+study._id)
        .then(function(res) {
            //study.loading = false;
            study.images = res.data;
            study.images.forEach(computeColor);
        });
    }

    $scope.load_image = function(study, series, image) {
        study.active_image = image;
        study.loading = true;
        $http.get(appconf.api+'/image/'+image._id)
        .then(function(res) {
            study.loading = false;
            study.active_tab = "issues";
            for(var k in res.data) {
                study.active_image[k] = res.data[k];
            }

            if(res.data.qc) {
                //load template if qc-ed
                //TODO - template might be missing even if it's qc-ed?
                var template = series.templates[res.data.qc.template_id];
                if(template)  {
                    $http.get(appconf.api+'/template/'+template._id+'/'+image.headers.InstanceNumber)
                    .then(function(res) {
                        //console.dir(res.data);
                        study.active_image.template = res.data;
                    });
                }
            }
        });
    }

    function computeColor(image) {
        var h = 0; 
        var s = "0%"; //saturation (default to gray)
        var l = "50%"; //light
        if(image.qc) {
            if(image.qc.e > 0) {
                h = 0; //red
                var _s = 50-image.qc.e;
                if(_s < 0) _l = 0;
                s = _s+"%";
            } else if(image.qc.w > 0) {
                h = 60; //yellow
                var _s = 50-image.qc.w;
                if(_s < 0) _l = 0;
                s = _s+"%";
            } else {
                h = 120; //green
                s = "50%";
            }
        }
        image.color = "hsl("+h+","+s+","+l+")";
    }

    $scope.invalidate_qc = function(study) {
        $http.put(appconf.api+'/study/qc/invalidate/'+study._id)
        .then(function(res) {
            toaster.success("Invalidated");
            //TODO reload study
        });
    }
}]);
*/

app.controller('StudyController', ['$scope', 'appconf', 'toaster', '$http', 'jwtHelper', '$location', 'menu', 'serverconf', '$routeParams', 'scaMessage',
function($scope, appconf, toaster, $http, jwtHelper,  $location, menu, serverconf, $routeParams, scaMessage) {
    scaMessage.show(toaster);
    menu.then(function(_menu) { $scope.menu = _menu; });
    serverconf.then(function(_serverconf) { $scope.serverconf = _serverconf; });

    $http.get(appconf.api+'/study/id/'+$routeParams.studyid)
    .then(function(res) {
        $scope.data = res.data;
        if($scope.data.images) $scope.data.images.forEach(computeColor);
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
        //console.dir(image);
        $scope.active_image = image;
        $http.get(appconf.api+'/image/'+image._id)
        .then(function(res) {
            $scope.image_detail = res.data;
            //console.dir($scope.image_detail);
        });
    }

}]);

app.controller('TemplateController', ['$scope', 'appconf', 'toaster', '$http', 'jwtHelper', '$location', 'menu', 'serverconf', '$routeParams', 'scaMessage',
function($scope, appconf, toaster, $http, jwtHelper, $location, menu, serverconf, $routeParams, scaMessage) {
    scaMessage.show(toaster);
    menu.then(function(_menu) { $scope.menu = _menu; });
    serverconf.then(function(_serverconf) { $scope.serverconf = _serverconf; });

    $http.get(appconf.api+'/template/head/'+$routeParams.templateid)
    .then(function(res) {
        $scope.head = res.data;
        //if($scope.data.images) $scope.data.images.forEach(computeColor);
    });

    $scope.active_template = null;
    $scope.load_template = function(template) {
        $scope.active_template = template;
        $http.get(appconf.api+'/template/inst/'+template._id)
        .then(function(res) {
            $scope.inst = res.data;    
        });
    }

}]);
