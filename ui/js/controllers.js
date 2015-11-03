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

    /*
    $scope.selected_research = null;
    $http.get(appconf.api+'/researches')
    .then(function(res) {
        $scope.researches = res.data;
        //doesn't work!
        //$scope.selected_research = res.data[0]._id;
    });
    */

    /*
    //data loaded so far..
    $scope.researches = {};
    $scope.serieses = {};
    $scope.templates = {};
    $scope.studies = []; //only one that's array (ordered by studytime)
    */

    $http.get(appconf.api+'/study/query', {params: {
        skip: 0, 
        limit: 400
    }})
    .then(function(res) {
        /*
        res.data.researches.forEach(function(r) {
            researches[r._id] = r;
        });
        res.data.serieses.forEach(function(s) {
            serieses[s._id] = s;
        });
        res.data.templates.forEach(function(t) {
            templates[t._id] = t;
        });
        res.data.studies.forEach(function(s) {
            studies.push(s); 
        });
        */
        var researches = {};
        res.data.researches.forEach(function(research) {
            researches[research._id] = research;
        });
        
        var serieses = {};
        res.data.serieses.forEach(function(series) {
            serieses[series._id] = series;
            //series.research = researches[series.research_id];
        });

        //store study
        $scope.researches = {};
        $scope.study_count = 0;
        res.data.studies.forEach(function(study) {
            $scope.study_count++;
            //study.series = serieses[study.series_id];
            
            //organize study under iibisid / modality / subject / series / study(series_number)
            var research_detail = researches[study.research_id];
            var research = $scope.researches[research_detail.IIBISID];
            if(research === undefined) {
                research = {
                    //_detail: researches[study.research_id], (stored under modality)
                    modalities: {},
                };
                $scope.researches[research_detail.IIBISID] = research;
            }

            var modality = research.modalities[research_detail.Modality];
            if(modality === undefined) {
                modality = {
                    _detail: researches[study.research_id],
                    subjects: {}, //contains serieses for each subject
                    template: { serieses: {} }, //contains serieses right beneath it
                };
                research.modalities[research_detail.Modality] = modality;
            }
            //series.studies[study._id] = study;

            var subject = modality.subjects[study.subject];
            if(subject === undefined) {
                subject = {
                    serieses: {}
                };
                modality.subjects[study.subject] = subject;
            }

            var series = subject.serieses[study.series_id];
            if(series === undefined) {
                series = {
                    _detail: serieses[study.series_id],
                    studies: {}
                };
                subject.serieses[study.series_id] = series;
            }
            series.studies[study._id] = study;
        });

        //count number of status for each subject
        for(var rid in $scope.researches) {
            var research = $scope.researches[rid];
            for(var modality_id in research.modalities) {
                var modality = research.modalities[modality_id];
                for(var subject_id in modality.subjects) {
                    var subject = modality.subjects[subject_id];
                    
                    subject.non_qced = 0; 
                    subject.oks = 0;
                    subject.errors = 0;
                    subject.warnings = 0;
                    subject.notemps = 0;
                    for(var series_id in subject.serieses) {
                        var series = subject.serieses[series_id];
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
        
        //store templates
        res.data.templates.forEach(function(template) {
            var research_detail = researches[template.research_id];
            var research = $scope.researches[research_detail.IIBISID];
            var modality = research.modalities[research_detail.Modality];
            var series = modality.template.serieses[template.series_id];
            if(series === undefined) {
                series = {
                    _detail: serieses[template.series_id],
                    templates: {}
                };
                modality.template.serieses[template.series_id] = series;
            }
            series.templates[template._id] = template;
        });

        //debug
        console.log("$scope.researches dump");
        console.dir($scope.researches);
    });

    /*
    $document.on('scroll', function() {
        $scope.$apply(function() {
            if(window.scrollY < 100) {
                $scope.content_affix = false;
            } else {
                $scope.content_affix = true;
            }
        });
    });
    */

    $scope.openstudy = function(study_id) {
        $location.path("/study/"+study_id);
    }
    $scope.scrollto = function(id) {
        $anchorScroll(id);
    }
}]);

app.controller('RecentOldController', ['$scope', 'appconf', 'toaster', '$http', 'jwtHelper', '$location', 'menu', 'serverconf',
function($scope, appconf, toaster, $http, jwtHelper, $location, menu, serverconf) {
    menu.then(function(_menu) { $scope.menu = _menu; });
    serverconf.then(function(_serverconf) { $scope.serverconf = _serverconf; });
    $scope.appconf = appconf;

    $http.get(appconf.api+'/study/recent')
    .then(function(res) {

        var researches = {};
        res.data.researches.forEach(function(research) {
            researches[research._id] = research;
        });
        
        var serieses = {};
        res.data.serieses.forEach(function(series) {
            serieses[series._id] = series;
        });

        $scope.researches = {};
        $scope.study_count = 0;
        
        //add series/research object references
        res.data.studies.forEach(function(study) {
            $scope.study_count++;
            study.series = serieses[study.series_id];
            
            //organize each study under research / series
            var research = $scope.researches[study.series.research_id];
            if(research === undefined) {
                research = {
                    research: researches[study.series.research_id],
                    serieses: {}
                };
                $scope.researches[study.series.research_id] = research;
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
        console.dir(image);
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
            console.dir($scope.image_detail);
        });
    }

}]);


