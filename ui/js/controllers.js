'use strict';

app.controller('HeaderController', ['$scope', 'appconf', '$route', 'toaster', '$http', 'jwtHelper', 'serverconf', 'menu', '$window', '$anchorScroll',
function($scope, appconf, $route, toaster, $http, jwtHelper, serverconf, menu, $window, $anchorScroll) {
    $scope.title = appconf.title;
    serverconf.then(function(_c) { $scope.serverconf = _c; });
    $scope.menu = menu;

    $scope.openstudy = function(id) {
        //$location.path("/study/"+study_id);
        $window.open("#/study/"+id, "study:"+id);
    }
    $scope.opentemplate = function(id) {
        //$location.path("/template/"+id);
        $window.open("#/template/"+id,  "tepmlate:"+id);
    }
    $scope.scrollto = function(id) {
        $anchorScroll(id);
    }
}]);

app.controller('AboutController', ['$scope', 'appconf', 'toaster', '$http', 'jwtHelper', 'serverconf', 'scaMessage',
function($scope, appconf, toaster, $http, jwtHelper, serverconf, scaMessage) {
    $scope.appconf = appconf;
    scaMessage.show(toaster);
    serverconf.then(function(_serverconf) { $scope.serverconf = _serverconf; });

    var jwt = localStorage.getItem(appconf.jwt_id);
    if(jwt) {
        $scope.user = jwtHelper.decodeToken(jwt);
    }
}]);

app.controller('RecentController', ['$scope', 'appconf', 'toaster', '$http', 'jwtHelper', 'serverconf', 'scaMessage', '$anchorScroll', '$document', '$window', '$location',
function($scope, appconf, toaster, $http, jwtHelper, serverconf, scaMessage, $anchorScroll, $document, $window, $location) {
    $scope.appconf = appconf;
    scaMessage.show(toaster);
    serverconf.then(function(_serverconf) { $scope.serverconf = _serverconf; });

    var jwt = localStorage.getItem(appconf.jwt_id);
    if(jwt) { $scope.user = jwtHelper.decodeToken(jwt); }

    $scope.view_mode = "wide";

    $http.get(appconf.api+'/study/query', {params: {
        skip: 0, 
        limit: appconf.recent_study_limit || 200,
    }})
    .then(function(res) {

        //process researches :: create research_id to research object mapping
        var researches = {};
        res.data.researches.forEach(function(research) {
            researches[research._id] = research;
        });

        //organize studies :: organize study under iibisid / modality / subject / series / study(#series_number)
        $scope.researches = {};
        $scope.study_count = res.data.studies.length;
        res.data.studies.forEach(function(study) {
            var research_detail = researches[study.research_id];
            if($scope.researches[research_detail.IIBISID] == undefined) $scope.researches[research_detail.IIBISID] = {};
            var modality_id = compose_modalityid(research_detail);
            var modality = $scope.researches[research_detail.IIBISID][modality_id];
            if(modality === undefined) {
                modality = {
                    _detail: researches[study.research_id],
                    subjects_times: {},
                    subjects: {}, 
                    templates_times: [], //not grouped by subjects like subjects_times
                    templates: {},
                };
                $scope.researches[research_detail.IIBISID][modality_id] = modality;
            }

            var subject = study.subject;
            var study_time = study.StudyTimestamp;
            if(modality.subjects_times[subject] === undefined) modality.subjects_times[subject] = [];
            if(!~modality.subjects_times[subject].indexOf(study_time)) modality.subjects_times[subject].push(study_time);
            if(modality.subjects[study.subject] == undefined) modality.subjects[study.subject] = {
                serieses: {},
                missing_series: [],
                
                //counters to be set below
                non_qced: 0,
                oks: 0,
                errors: 0,
                warnings: 0,
                notemps: 0,
            };
            if(modality.subjects[study.subject].serieses[study.series_desc] == undefined)  modality.subjects[study.subject].serieses[study.series_desc] = {};
            modality.subjects[study.subject].serieses[study.series_desc][study_time] = study;
        });
        
        //oranize templates
        res.data.templates.forEach(function(template) {
            var research_detail = researches[template.research_id];
            var research = $scope.researches[research_detail.IIBISID];
            var modality_id = compose_modalityid(research_detail);
            var modality = research[modality_id];
            var time = template.date;
            var series_desc = template.series_desc;
            if(!~modality.templates_times.indexOf(time)) modality.templates_times.push(time);
            if(modality.templates[series_desc] == undefined) modality.templates[series_desc] = {};
            modality.templates[series_desc][time] = template;
        });

        //do some extra processing for each subject
        for(var research_id in $scope.researches) {
            var modalities = $scope.researches[research_id];
            for(var modality_id in modalities) {
                var modality = modalities[modality_id];
                for(var subject_id in modality.subjects) {
                    var subject = modality.subjects[subject_id];

                    //create uid for subject
                    subject.uid = research_id+modality_id+subject_id;
                    
                    //count number of status for each subject
                    for(var series_desc in subject.serieses) {
                        var times = subject.serieses[series_desc];
                        for(var time in times) {
                            var study = times[time];
                            /*
                            if(study._excluded) {
                                series._excluded = true;
                                continue;
                            }
                            */
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

                    //find missing series 
                    //find the series that starts with template_series_desc
                    for(var template_series_desc in modality.templates) {
                        var found = false;
                        for(var series_desc in subject.serieses) {
                            if(series_desc.startsWith(template_series_desc)) {
                                found = true;
                                break;
                            }
                        }
                        if(!found) {
                            subject.missing_series.push(modality.templates[template_series_desc]);
                        }
                    }
 
                }
            }
        }
        
        
        /*
        //create uid for subject 
        for(var research_id in $scope.researches) {
            var research = $scope.researches[research_id];
            for(var modality_id in research) {
                var modality = research[modality_id];
                for(var subject_id in modality.subjects) {
                    var subject = modality.subjects[subject_id];
                }
            }
        }
        */

        /*
        //find missing series 
        for(var research_id in $scope.researches) {
            var research = $scope.researches[research_id];
            for(var modality_id in research) {
                var modality = research[modality_id];
                //for each subject
                for(var subject_id in modality.subjects) {
                    var subject = modality.subjects[subject_id];
                    subject.missing_series = [];
                    
                    //find the series that starts with template_series_desc
                    for(var template_series_desc in modality.template.serieses) {
                        var found = false;
                        for(var series_desc in subject.serieses) {
                            if(series_desc.startsWith(template_series_desc)) {
                                found = true;
                                break;
                            }
                        }
                        if(!found) {
                            //console.log("Failed to find "+template_series_desc+" under "+subject_id);
                            subject.missing_series.push(modality.template.serieses[template_series_desc]);
                        }
                    }
                }
            }
        }
        */
    }, function(res) {
        if(res.data && res.data.message) toaster.error(res.data.message);
        else toaster.error(res.statusText);
    });

    var affix = document.getElementById("affix");
    if(affix) $document.on('scroll', function() {
        var top_offset = 100;
        var bottom_offset = 176;
        if(window.scrollY < top_offset) {
            //at the top - no need for affix
            affix.style.top = 0; //keep it out of following if - incase user scroll bottom to top in a single click (could happen)
            if($scope.content_affix) $scope.$apply(function() {
                $scope.content_affix = false;
            });
        } else {
            if(window.scrollY > document.body.clientHeight - window.innerHeight - bottom_offset) {
                //un affix and move to bottom if user scroll to the bottom
                if($scope.content_affix) $scope.$apply(function() {
                    $scope.content_affix = false;
                    affix.style.top = parseInt(document.body.clientHeight - affix.scrollHeight - bottom_offset - top_offset)+"px";
                    affix.scrollTop = 0; //cheat so that I don't have to fix scroll pos when user scroll back to top
                });
            } else {
                //affix it
                if(!$scope.content_affix) $scope.$apply(function() {
                    //console.log("affixing");
                    $scope.content_affix = true;
                    affix.style.top = "0px";
                });
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

    function compose_modalityid(research_detail) {
        return research_detail.Modality+"."+research_detail.StationName+"."+research_detail.radio_tracer;
    }

    /* refactored to HeaderController
    $scope.openstudy = function(study_id) { 
        $location.path("/study/"+study_id);
    }
    $scope.opentemplate = function(id) {
        $location.path("/template/"+id);
    }
    $scope.scrollto = function(id) {
        $anchorScroll(id);
    }
    */
    /* arvind reuqested to remove this for now (only add this on IIBISID view)
    $scope.reqc = function(research_id) {
        console.dir(research_id);
        $http.post(appconf.api+'/study/reqc/byresearchid/'+research_id)
        .then(function(res) {
            //TODO reload page?
            toaster.success(res.data.message);
        }, function(res) {
            if(res.data && res.data.message) toaster.error(res.data.message);
            else toaster.error(res.statusText);
        });
    }
    */
}]);

app.controller('ResearchController', ['$scope', 'appconf', 'toaster', '$http', 'jwtHelper', '$location', 'serverconf', 'scaMessage', '$anchorScroll', '$document', '$window', '$routeParams',
function($scope, appconf, toaster, $http, jwtHelper, $location, serverconf, scaMessage, $anchorScroll, $document, $window, $routeParams) {
    $scope.appconf = appconf;
    scaMessage.show(toaster);
    serverconf.then(function(_serverconf) { $scope.serverconf = _serverconf; });
    var jwt = localStorage.getItem(appconf.jwt_id);
    if(jwt) $scope.user = jwtHelper.decodeToken(jwt);

    $scope.view_mode = "tall";

    $http.get(appconf.api+'/researches')
    .then(function(res) {
        //organize records into IIBISID / (Modality+StationName+Radio Tracer)
        $scope.researches = {};
        res.data.forEach(function(rec) {
            if(!$scope.researches[rec.IIBISID]) $scope.researches[rec.IIBISID] = [];
            $scope.researches[rec.IIBISID].push(rec);
        });

        if($routeParams.researchid) {
            load_series($routeParams.researchid);
        } else {
            //redirect with first research selected
            if(res.data.length > 0) $location.path("/research/"+res.data[0]._id);
        }
    }, function(res) {
        if(res.data && res.data.message) toaster.error(res.data.message);
        else toaster.error(res.statusText);
    });     

    function load_series(research_id) {
        $scope.research_id = research_id;
        $http.get(appconf.api+'/study/byresearchid/'+research_id)
        .then(function(res) {
            $scope.study_count = res.data.studies.length;

            $scope.subjects_times = {};
            $scope.subjects = {};

            //organize studies/templates into series_desc / subject / study_time+series number
            res.data.studies.forEach(function(study) {
                var subject = study.subject;
                var series_desc = study.series_desc;
                var study_time = study.StudyTimestamp;
                if($scope.subjects_times[subject] == undefined) $scope.subjects_times[subject] = [];
                if(!~$scope.subjects_times[subject].indexOf(study_time)) $scope.subjects_times[subject].push(study_time);
                if($scope.subjects[subject] == undefined) $scope.subjects[subject] = {};
                if($scope.subjects[subject][series_desc] == undefined) $scope.subjects[subject][series_desc] = {};
                $scope.subjects[subject][series_desc][study_time] = study;
                //if(study._excluded) $scope.subjects[subject][series_desc]._excluded = true;
            });

            //create a matrix of template time / descs
            $scope.templates_times = [];
            $scope.templates = {};
            res.data.templates.forEach(function(template) {
                var series_desc = template.series_desc;
                var template_time = template.date;
                if(!~$scope.templates_times.indexOf(template_time)) $scope.templates_times.push(template_time);
                if($scope.templates[series_desc] == undefined) $scope.templates[series_desc] = {};
                $scope.templates[series_desc][template_time] = template; 
            });
            //console.dir(res.data.templates);
            //console.dir($scope.templates);
        }, function(res) {
            if(res.data && res.data.message) toaster.error(res.data.message);
            else toaster.error(res.statusText);
        });
    }
    /*
    $scope.openstudy = function(study_id) {
        $location.path("/study/"+study_id);
    }
    $scope.opentemplate = function(id) {
        $location.path("/template/"+id);
    }
    */
}]);

app.component('subjectDetail', {
    templateUrl: 't/components/subjectdetail.html',
    controller: function($window) { 
        this.openstudy = function(id) {
            $window.open("#/study/"+id, "study:"+id);
        }
    },
    bindings: {
        mode: '=', //view mode ('wide' / 'tall')
        serieses: '<', //[series_desc][time] = study
        times: '<', //list of timestamps to show
    },
});

app.component('templates', {
    templateUrl: 't/components/templates.html',
    controller: function($window) { 
        this.opentemplate = function(id) {
            $window.open("#/template/"+id, "template:"+id);
        }
    },
    bindings: {
        templates: '<', //[time] = template
        times: '<', //list of timestamps to show
    },
});

app.component('viewmodeToggler', {
    templateUrl: 't/components/viewmodetoggler.html',
    /*
    controller: function($window) { 
        this.openstudy = function(id) {
            $window.open("#/study/"+id, "study:"+id);
        }
    },
    */
    bindings: {
        mode: '=', //view mode ('wide' / 'tall')
    },
});


app.controller('QCController', ['$scope', 'appconf', 'toaster', '$http', 'jwtHelper', '$location', 'serverconf', 'scaMessage', '$anchorScroll', '$document', '$window', '$routeParams',
function($scope, appconf, toaster, $http, jwtHelper, $location, serverconf, scaMessage, $anchorScroll, $document, $window, $routeParams) {
    $scope.appconf = appconf;
    scaMessage.show(toaster);
    serverconf.then(function(_serverconf) { $scope.serverconf = _serverconf; });
    var jwt = localStorage.getItem(appconf.jwt_id);
    if(jwt) $scope.user = jwtHelper.decodeToken(jwt);
    $scope.page = "qc"+$routeParams.level;

    $scope.view_mode = "tall";

    //construct query
    switch(parseInt($routeParams.level)) {
    case 1:
        //var where = {qc1_state: {$exists: false}};
        var where = {qc1_state: 'fail'};
        break;
    case 2:
        var where = {qc2_state: {$exists: false}};
        break;
    default:
        toaster.error("Unknown QC level "+$routeParams.level);
    }
    //run query
    $http.get(appconf.api+'/study/query', {params: {
        skip: 0, 
        limit: appconf.qc_study_limit || 200,
        where: where,
    }})
    .then(function(res) {
        $scope.debug = res.data;

        //set researches
        $scope.researches = {};
        res.data.researches.forEach(function(r) {
            $scope.researches[r._id] = r;
        });

        //organize studies/templates into series_desc / subject / study_time+series number
        $scope.study_count = res.data.studies.length;
        $scope.iibisids = {};
        res.data.studies.forEach(function(study) {
            var iibisid = study.IIBISID;
            var research_id = study.research_id;
            var series_desc = study.series_desc;
            var subject = study.subject;
            if($scope.iibisids[iibisid] == undefined) $scope.iibisids[iibisid] = {};
            if($scope.iibisids[iibisid][research_id] == undefined) $scope.iibisids[iibisid][research_id] = {};
            if($scope.iibisids[iibisid][research_id][subject] == undefined) 
                $scope.iibisids[iibisid][research_id][subject] = {};
            if($scope.iibisids[iibisid][research_id][subject][study.StudyTimestamp] == undefined) 
                $scope.iibisids[iibisid][research_id][subject][study.StudyTimestamp] = {};
            if($scope.iibisids[iibisid][research_id][subject][study.StudyTimestamp][series_desc] == undefined) 
                $scope.iibisids[iibisid][research_id][subject][study.StudyTimestamp][series_desc] = []; 
            $scope.iibisids[iibisid][research_id][subject][study.StudyTimestamp][series_desc].push(study);
        });
        //console.dir($scope.iibisids);

        /*
        //TODO - maybe move all these logics to api?
        var iibisids = {};
        res.data.iibisids.forEach(function(research) {
            iibisids[research._id] = research;
        });
        */
    }, function(res) {
        if(res.data && res.data.message) toaster.error(res.data.message);
        else toaster.error(res.statusText);
    });
}]);

//used to be StudyController
app.controller('SeriesController', ['$scope', 'appconf', 'toaster', '$http', 'jwtHelper', '$location', 'serverconf', '$routeParams', 'scaMessage', 'users', '$timeout',
function($scope, appconf, toaster, $http, jwtHelper,  $location, serverconf, $routeParams, scaMessage, users, $timeout) {
    $scope.appconf = appconf;
    scaMessage.show(toaster);
    serverconf.then(function(_serverconf) { $scope.serverconf = _serverconf; });
    var jwt = localStorage.getItem(appconf.jwt_id);
    if(jwt) $scope.user = jwtHelper.decodeToken(jwt);
    
    //load userprofiles for comments..
    //TODO loading all user is stupid.. just load the users who are authors of comments
    users.then(function(_users) { $scope.users = _users; });
    load_study();

    function load_study() {
        if(!$routeParams.studyid) return; //probably the route changed since last time
        $http.get(appconf.api+'/study/id/'+$routeParams.studyid)
        .then(function(res) {
            $scope.data = res.data;
            if($scope.data.images) {
                $scope.data.images.forEach(computeColor);
            }
            //find template object selected / used by QC
            res.data.templates.forEach(function(template) {
                //console.log(template._id);
                if(template._id == res.data.study.template_id) res.data.template = template;
                if(res.data.study.qc && template._id == res.data.study.qc.template_id) res.data.qc_template = template;
            });
            //console.log(res.data);
            //reload if qc is not yet loaded
            if(!res.data.study.qc) {
                $timeout(load_study, 1000);
            }
        }, function(res) {
            if(res.data && res.data.message) toaster.error(res.data.message);
            else toaster.error(res.statusText);
        });
    }
    
    //TODO this needs some overhawling
    function computeColor(image) {
        var h = 0; 
        var s = "0%"; //saturation (default to gray)
        var l = "50%"; //light
        if(image.errors !== undefined) {
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
        }
        image.color = "hsl("+h+","+s+","+l+")";
    }

    $scope.load_image = function(image) {
        if($scope.active_image == image) {
            $scope.image_detail = null;
            $scope.active_image = null;
            return;
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
                    if(warning.k) $scope.image_warnings[warning.k] = warning;
                    else $scope.other_warnings.push(warning);
                });
            }
        
            //if there is no error to show, show all headers by default
            $scope.show_all_headers = true;
            if($scope.image_detail.qc) {
                if($scope.image_detail.qc.errors != 0 || $scope.image_detail.qc.warnings != 0) {
                    $scope.show_all_headers = false;
                }
            }
        }, function(res) {
            if(res.data && res.data.message) toaster.error(res.data.message);
            else toaster.error(res.statusText);
        });
    }
    $scope.showallheaders = function() {
        $scope.show_all_headers = true;
    }
    $scope.opentemplate = function(id) {
        $location.path("/template/"+id);
    }

    $scope.addcomment = function() {
        $http.post(appconf.api+'/study/comment/'+$routeParams.studyid, {comment: $scope.newcomment})
        .then(function(res) {
            $scope.data.study.comments.push(res.data);
            $scope.newcomment = "";
        }, function(res) {
            if(res.data && res.data.message) toaster.error(res.data.message);
            else toaster.error(res.statusText);
        });
    }
    $scope.changestate = function(level, state) {
        var comment = null;
        //TODO - user can disable prompt via browser.. also, canceling doesn't prevent user from switching the ui-button state
        //I should implement a bit more form like interface for state change
        if(state != "accept") comment = prompt("Please enter comment for this state change");

        $scope.data.study.qc1state = state;
        $http.post(appconf.api+'/study/qcstate/'+$routeParams.studyid, {level: level, state: state, comment: comment})
        .then(function(res) {
            $scope.data.study.events.push(res.data.event);
            toaster.success(res.data.message);
        }, function(res) {
            if(res.data && res.data.message) toaster.error(res.data.message);
            else toaster.error(res.statusText);
        });
    }
    $scope.select_template = function(item) {
        $scope.image_detail = null;
        $scope.active_image = null;
        $http.post(appconf.api+'/study/template/'+$routeParams.studyid, {template_id: item._id})
        .then(function(res) {
            load_study();
            toaster.success(res.data.message);
        }, function(res) {
            if(res.data && res.data.message) toaster.error(res.data.message);
            else toaster.error(res.statusText);
        });
    }
    $scope.reqc = function() {
        $scope.image_detail = null;
        $scope.active_image = null;
        $http.post(appconf.api+'/study/reqc/bystudyid/'+$routeParams.studyid)
        .then(function(res) {
            load_study();
            toaster.success(res.data.message);
        }, function(res) {
            if(res.data && res.data.message) toaster.error(res.data.message);
            else toaster.error(res.statusText);
        });
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
    }, function(res) {
        if(res.data && res.data.message) toaster.error(res.data.message);
        else toaster.error(res.statusText);
    });

    $scope.load_template = function(template) {
        $scope.active_template = template;
        $http.get(appconf.api+'/template/inst/'+template._id)
        .then(function(res) {
            $scope.image_detail = res.data;
        }, function(res) {
            if(res.data && res.data.message) toaster.error(res.data.message);
            else toaster.error(res.statusText);
        });
    }
}]);

app.controller('AdminController', ['$scope', 'appconf', 'toaster', '$http', 'jwtHelper', 'serverconf', 'scaMessage', 'groups',
function($scope, appconf, toaster, $http, jwtHelper, serverconf, scaMessage, groups) {
    $scope.appconf = appconf;
    scaMessage.show(toaster);
    serverconf.then(function(_serverconf) { $scope.serverconf = _serverconf; });

    var jwt = localStorage.getItem(appconf.jwt_id);
    if(jwt) { $scope.user = jwtHelper.decodeToken(jwt); }

    $http.get(appconf.api+'/researches/')
    .then(function(res) {
        //find unique iibisids
        $scope.iibisids = [];
        res.data.forEach(function(research) {
            if(!~$scope.iibisids.indexOf(research.IIBISID)) $scope.iibisids.push(research.IIBISID);
        });
    }, function(res) {
        if(res.data && res.data.message) toaster.error(res.data.message);
        else toaster.error(res.statusText);
    })
    .then(function(res) {
        groups.then(function(_groups) {
            $scope.groups = _groups;
            //conver to easy to lookup object
            $scope.groups_o = [];
            $scope.groups.forEach(function(group) {
                $scope.groups_o[group.id] = group;
            });
        });
    })
    .then(function(res) {
        $http.get(appconf.api+'/acl/iibisid')
        .then(function(res) {
            $scope.acl = res.data;
            //console.dir($scope.acl);
            $scope._acl = {};
            $scope.iibisids.forEach(function(id) {
                //deal with case where acl is not set at all..
                if($scope.acl[id] == undefined) {
                    $scope.acl[id] = {
                        view: {groups: []},
                        qc: {groups: []},
                    }; 
                } 
    
                $scope._acl[id] = {
                    view: {groups: []},
                    qc: {groups: []},
                };
                
                //convert group id to object
                for(var action in $scope.acl[id]) {
                    var acl = $scope.acl[id][action];
                    if(acl.groups) acl.groups.forEach(function(gid) {
                        $scope._acl[id][action].groups.push($scope.groups_o[gid]);
                    });
                }
            });
        }, function(res) {
            if(res.data && res.data.message) toaster.error(res.data.message);
            else toaster.error(res.statusText);
        });
    });

    $scope.update_acl = function() {
        //convert object to id
        for(var id in $scope._acl) {
            $scope.acl[id] = {}; //clear other junks
            for(var action in $scope._acl[id]) {
                var acl = $scope._acl[id][action];
                var ids = [];
                acl.groups.forEach(function(group) {
                    ids.push(group.id);
                });
                $scope.acl[id][action] = {groups: ids, users: []}; //TODO with users
            }
        };

        $http.put(appconf.api+'/acl/iibisid', $scope.acl)
        .then(function(res) {
            $scope.form.$setPristine();
            toaster.success("Updated Successfully!");
        }, function(res) {
            if(res.data && res.data.message) toaster.error(res.data.message);
            else toaster.error(res.statusText);
        });
    }
}]);


