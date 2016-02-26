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

function compose_modalityid(research_detail) {
    return research_detail.Modality+"."+research_detail.StationName+"."+research_detail.radio_tracer;
}

//organize series :: organize study under iibisid / modality / subject / series / study(#series_number)
function organize_series(researches, serieses) {
    var ret = {};
    serieses.forEach(function(study) {
        var research_detail = researches[study.research_id];
        if(ret[research_detail.IIBISID] == undefined) ret[research_detail.IIBISID] = {};
        var modality_id = compose_modalityid(research_detail);
        var modality = ret[research_detail.IIBISID][modality_id];
        if(modality === undefined) {
            modality = {
                _detail: researches[study.research_id],
                subjects_times: {},
                subjects: {}, 
                templates_times: [], //array - because not grouped by subjects like subjects_times
                templates: {},
            };
            ret[research_detail.IIBISID][modality_id] = modality;
        }

        var subject = study.subject;
        var study_time = study.StudyTimestamp;
        var exam_id = study.exam_id;
        if(modality.subjects_times[subject] === undefined) modality.subjects_times[subject] = {};
        modality.subjects_times[subject][exam_id] = study_time;
        if(modality.subjects[study.subject] == undefined) modality.subjects[study.subject] = {
            serieses: {},
            missing_serieses: {},
            //missing_series_descs: [],
            
            //counters to be set below
            non_qced: 0,
            oks: 0,
            errors: 0,
            warnings: 0,
            notemps: 0,
            missing: 0, 
        };
        if(modality.subjects[study.subject].serieses[study.series_desc] == undefined)  modality.subjects[study.subject].serieses[study.series_desc] = {};
        modality.subjects[study.subject].serieses[study.series_desc][exam_id] = study;
    });
    return ret;
}

app.controller('RecentController', ['$scope', 'appconf', 'toaster', '$http', 'jwtHelper', 'serverconf', 'scaMessage', '$anchorScroll', '$document', '$window', '$location',
function($scope, appconf, toaster, $http, jwtHelper, serverconf, scaMessage, $anchorScroll, $document, $window, $location) {
    $scope.appconf = appconf;
    scaMessage.show(toaster);
    serverconf.then(function(_serverconf) { $scope.serverconf = _serverconf; });

    var jwt = localStorage.getItem(appconf.jwt_id);
    if(jwt) { $scope.user = jwtHelper.decodeToken(jwt); }

    $scope.view_mode = "tall";

    $scope.$on("exam_invalidated", function(event, msg) {
        console.dir(msg);
        $http.get(appconf.api+'/study/query', {params: {
            where: {exam_id: msg.exam_id}
        }})
        .then(function(res) {
            /*
            //process researches :: create research_id to research object mapping
            var researches = {};
            res.data.researches.forEach(function(research) {
                researches[research._id] = research;
            });
            $scope.study_count = res.data.studies.length;
            */
            var n = organize_series(researches, res.data.studies);
            console.dir(n);
        }, function(res) {
            if(res.data && res.data.message) toaster.error(res.data.message);
            else toaster.error(res.statusText);
        });
     });

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

        $scope.study_count = res.data.studies.length;
        $scope.researches = organize_series(researches, res.data.studies);
        
        //organize templates
        $scope.templates = {};
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
            $scope.templates[template._id] = template;
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
                        var exams = subject.serieses[series_desc];
                        for(var exam_id in exams) {
                            var study = exams[exam_id];
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
                    
                    //find latest template timestamp
                    var latest = null;
                    modality.templates_times.forEach(function(time) {   
                        if(latest == null || latest < time) latest = time;
                    });
                    //create list of teamplate_series_desc that all exam should have
                    var template_series_descs = {};
                    for(var template_series_desc in modality.templates) {
                        var template = modality.templates[template_series_desc][latest];
                        if(template) template_series_descs[template_series_desc] = template;
                    }
                    //find *missing* subject for each exam times (for this subject) using the latest set of template (tmeplate_series_descs)
                    //modality.subjects_times[subject_id].forEach(function(time) {
                    for(var exam_id in modality.subjects_times[subject_id]) {
                        var time = modality.subjects_times[subject_id][exam_id];
                        subject.missing_serieses[time] = {};
                        for(var template_series_desc in template_series_descs) {
                            var found = false;
                            for(var series_desc in subject.serieses) {
                                if(subject.serieses[series_desc][time] == undefined) continue; //wrong time
                                if(series_desc.startsWith(template_series_desc)) {
                                    found = true;
                                    break;
                                }
                            }
                            if(!found) {
                                subject.missing_serieses[time][template_series_desc] = template_series_descs[template_series_desc];
                                subject.missing++;
                            }
                        }
                    };
                }
            }
        }
        
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
}]);

app.controller('ResearchController', ['$scope', 'appconf', 'toaster', '$http', 'jwtHelper', '$location', 'serverconf', 'scaMessage', '$anchorScroll', '$document', '$window', '$routeParams',
function($scope, appconf, toaster, $http, jwtHelper, $location, serverconf, scaMessage, $anchorScroll, $document, $window, $routeParams) {
    $scope.appconf = appconf;
    scaMessage.show(toaster);
    serverconf.then(function(_serverconf) { $scope.serverconf = _serverconf; });
    var jwt = localStorage.getItem(appconf.jwt_id);
    if(jwt) $scope.user = jwtHelper.decodeToken(jwt);

    $scope.view_mode = "tall";

    $http.get(appconf.api+'/research')
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
                var exam_id = study.exam_id;
                if($scope.subjects_times[subject] == undefined) $scope.subjects_times[subject] = {};
                $scope.subjects_times[subject][exam_id] = study_time;
                if($scope.subjects[subject] == undefined) $scope.subjects[subject] = {
                    serieses: {}
                };
                if($scope.subjects[subject].serieses[series_desc] == undefined) $scope.subjects[subject].serieses[series_desc] = {};
                $scope.subjects[subject].serieses[series_desc][exam_id] = study;
            });

            //create a matrix of template time / descs
            $scope.templates_times = [];
            $scope.templates_matrix = {}; //[series_desc][template_time] = template
            $scope.templates = {}; //[template._id] = template;
            res.data.templates.forEach(function(template) {
                var series_desc = template.series_desc;
                var template_time = template.date;
                if(!~$scope.templates_times.indexOf(template_time)) $scope.templates_times.push(template_time);
                if($scope.templates_matrix[series_desc] == undefined) $scope.templates_matrix[series_desc] = {};
                $scope.templates_matrix[series_desc][template_time] = template; 
                $scope.templates[template._id] = template;
            });
        }, function(res) {
            if(res.data && res.data.message) toaster.error(res.data.message);
            else toaster.error(res.statusText);
        });
    }
}]);

app.component('exams', {
    templateUrl: 't/components/exams.html',
    /*
    require: {
        tabsCtrl: '^myTabs'
    },
    */
    controller: function($scope, appconf, $window, $http, toaster) { 

        //list of series descs that has missing series
        this.missing_series_descs = [];
        for(var time in this.missing) {
            for(var desc in this.missing[time]) {
                if(!~this.missing_series_descs.indexOf(desc)) {
                    this.missing_series_descs.push(desc);
                }
            } 
        }

        this.openstudy = function(id) {
            $window.open("#/study/"+id, "study:"+id);
        }
        this.opentemplate = function(id) {
            $window.open("#/template/"+id);
        }
        //is this still used?
        this.keys = function(obj){
            return obj? Object.keys(obj) : [];
        }

        this.reqc = function(exam_id) {
            $http.post(appconf.api+'/study/reqc', {
                /*
                research_id: this.researchid,
                subject: this.subject,
                StudyTimestamp: time,
                */
                exam_id: exam_id,
            })
            .then(function(res) {
                $scope.$emit("exam_invalidated", {exam_id: exam_id});
                toaster.success(res.data.message);
            }, function(res) {
                if(res.data && res.data.message) toaster.error(res.data.message);
                else toaster.error(res.statusText);
            });
        }
    },
    bindings: {
        researchid: '<',
        subject: '<',
        mode: '=', //view mode ('wide' / 'tall')
        serieses: '<', //[series_desc][time] = study
        missing: '<', //[time][series_desc] = template  
        times: '<', //list of timestamps to show
        templates: '<', //list of templates referenced in series.qc
    },
});

app.component('templates', {
    templateUrl: 't/components/templates.html',
    controller: function($window) { 
        this.opentemplate = function(id) {
            $window.open("#/template/"+id, "template:"+id);
        }
        this.keys = function(obj){
            return obj? Object.keys(obj) : [];
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
        var researches = {};
        res.data.researches.forEach(function(r) {
            researches[r._id] = r;
        });

        //organize studies/templates into series_desc / subject / study_time+series number
        $scope.study_count = res.data.studies.length;
        $scope.researches = organize_series(researches, res.data.studies);
        $scope.templates = {};
        res.data.templates.forEach(function(template) {
            $scope.templates[template._id] = template;
        /*
            var exam_id = template.exam_id;
            var series_desc = template.series_desc;
            if($scope.templates[exam_id] == undefined) $scope.templates[exam_id] = {};
            $scope.templates[exam_id][series_desc] = template; 
        */
        });
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
    load_series();

    function load_series() {
        if(!$routeParams.seriesid) return; //probably the route changed since last time
        $http.get(appconf.api+'/study/id/'+$routeParams.seriesid)
        .then(function(res) {
            $scope.data = res.data;
            if($scope.data.images) {
                $scope.data.images.forEach(computeColor);
            }
            //find template object selected / used by QC
            res.data.template_exams.forEach(function(exam) {
                if(exam._id == res.data.series.template_exam_id) res.data.template_exam = exam;
            });
            //reload if qc is not yet loaded
            if(!res.data.series.qc) {
                $timeout(load_series, 1000);
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
        $http.post(appconf.api+'/study/comment/'+$routeParams.seriesid, {comment: $scope.newcomment})
        .then(function(res) {
            $scope.data.series.comments.push(res.data);
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

        $scope.data.series.qc1state = state;
        $http.post(appconf.api+'/study/qcstate/'+$routeParams.seriesid, {level: level, state: state, comment: comment})
        .then(function(res) {
            $scope.data.series.events.push(res.data.event);
            toaster.success(res.data.message);
        }, function(res) {
            if(res.data && res.data.message) toaster.error(res.data.message);
            else toaster.error(res.statusText);
        });
    }
    $scope.select_template = function(item) {
        //console.dir(item);
        $scope.image_detail = null;
        $scope.active_image = null;
        $http.post(appconf.api+'/study/template/'+$routeParams.seriesid, {exam_id: item._id})
        .then(function(res) {
            load_series();
            toaster.success(res.data.message);
        }, function(res) {
            if(res.data && res.data.message) toaster.error(res.data.message);
            else toaster.error(res.statusText);
        });
    }
    $scope.reqc = function() {
        $scope.image_detail = null;
        $scope.active_image = null;
        $http.post(appconf.api+'/study/reqc/', {_id: $routeParams.seriesid})
        .then(function(res) {
            load_series();
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

    $http.get(appconf.api+'/research')
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


