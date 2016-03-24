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

function organize($scope, data) {
    $scope.org = {};
    $scope.qcing = false; //will be reset to true if there is any series with no qc

    //just a quick count used commonly in UI
    $scope.series_count = data.studies.length;
    
    //for easy research detail lookup
    var researches = {}; 
    data.researches.forEach(function(research) {
        researches[research._id] = research;
    });
    function get_modality(research_id) {
        var research_detail = researches[research_id];
        if($scope.org[research_detail.IIBISID] == undefined) $scope.org[research_detail.IIBISID] = {};
        var modality_id = compose_modalityid(research_detail);
        var modality = $scope.org[research_detail.IIBISID][modality_id];
        if(modality === undefined) {
            modality = {
                _detail: research_detail,
                subjects_times: {},
                subjects: {}, 
                templates_times: [], //array - because not grouped by subjects like subjects_times
                templates: {},

            };
            $scope.org[research_detail.IIBISID][modality_id] = modality;
        }
        return modality;
    }

    //organize series
    data.studies.forEach(function(series) {
        var subject = series.subject;
        var series_desc = series.series_desc;
        var exam_id = series.exam_id;

        var modality = get_modality(series.research_id);
        if(modality.subjects_times[subject] === undefined) modality.subjects_times[subject] = {};
        modality.subjects_times[subject][exam_id] = series.StudyTimestamp;
        if(modality.subjects[subject] == undefined) modality.subjects[subject] = {
            //subject could contain a lot of different attributes other than serieses.
            serieses: {},
            missing_serieses: {},
            
            //counter.. should I move the counting logic from recent to here?
            missing: 0,
        };
                
        if(modality.subjects[subject].serieses[series_desc] == undefined) modality.subjects[subject].serieses[series_desc] = {exams: {}};
        if(modality.subjects[subject].serieses[series_desc].exams[exam_id] == undefined) modality.subjects[subject].serieses[series_desc].exams[exam_id] = [];
        //unshift to put the latest one on the top - since serieses are sorted by studytime/-seriesnumber
        modality.subjects[subject].serieses[series_desc].exams[exam_id].unshift(series); 
        if(series.qc == undefined) $scope.qcing = true;
        if(series.isexcluded) modality.subjects[subject].serieses[series_desc]._isexcluded = series.isexcluded;
    });

  
    //organize templates
    $scope.templates = {}; //for quick id to template mapping
    data.templates.forEach(function(template) {
        $scope.templates[template._id] = template;

        var time = template.date;
        var series_desc = template.series_desc;
        var modality = get_modality(template.research_id);
        if(!~modality.templates_times.indexOf(time)) modality.templates_times.push(time);
        if(modality.templates[series_desc] == undefined) modality.templates[series_desc] = {};
        if(modality.templates[series_desc][time] == undefined) modality.templates[series_desc][time] = [];
        modality.templates[series_desc][time].push(template);
    });
    
    //for each exam/template, find the min SeriesNumber so that UI can sort by it
    for(var research_id in $scope.org) {
        var modalities = $scope.org[research_id];
        for(var modality_id in modalities) {
            var modality = modalities[modality_id];

            for(var subject_id in modality.subjects) {
                var subject = modality.subjects[subject_id];
                for(var series_desc in modality.subjects[subject_id].serieses) {
                    var series_groups = modality.subjects[subject_id].serieses[series_desc];
                    var min = null;
                    for(var exam_id in series_groups.exams) {
                        var serieses = series_groups.exams[exam_id];
                        serieses.forEach(function(series) {
                            if(min == null || series.SeriesNumber < min) min = series.SeriesNumber;
                        });
                    }
                    series_groups.min_SeriesNumber = min;
                }
            }

            for(var series_desc in modality.templates) {
                var times = modality.templates[series_desc];
                var min = null;
                for(var time in times) {
                    //TODO this could be a list of serieses in the near future?
                    times[time].forEach(function(template) {
                        if(min == null || template.SeriesNumber < min) min = template.SeriesNumber;
                    });
                }
                times.min_SeriesNumber = min;
            }
        }
    }

    //find missing series
    for(var research_id in $scope.org) {
        var modalities = $scope.org[research_id];
        for(var modality_id in modalities) {
            var modality = modalities[modality_id];
            for(var subject_id in modality.subjects) {
                var subject = modality.subjects[subject_id];

                //contruct unique id to be used by anchor
                subject.uid = research_id+modality_id+subject_id;
                
                ///////////////////////////////////////////////////////////////////////
                //
                // finding missing
                //
                // first.. find latest template timestamp
                var latest = null;
                modality.templates_times.forEach(function(time) {   
                    if(latest == null || latest < time) latest = time;
                });
                // then create list of teamplate_series_desc that all exam should have
                var template_series_descs = {};
                for(var template_series_desc in modality.templates) {
                    var templates = modality.templates[template_series_desc][latest];
                    if(templates) template_series_descs[template_series_desc] = templates;
                }
                // finally find *missing* subject for each exam times (for this subject) using the latest set of template (tmeplate_series_descs)
                for(var exam_id in modality.subjects_times[subject_id]) {
                    var time = modality.subjects_times[subject_id][exam_id];
                    subject.missing_serieses[time] = {};
                    for(var template_series_desc in template_series_descs) {
                        var found = false;
                        for(var series_desc in subject.serieses) {
                            if(subject.serieses[series_desc].exams[exam_id] == undefined) continue; //wrong time
                            if(series_desc.startsWith(template_series_desc)) {
                                found = true;
                                break;
                            }
                        }
                        if(!found) {
                            subject.missing_serieses[time][template_series_desc] = template_series_descs[template_series_desc];
                            subject.missing++;
                            //console.log(subject.uid + " missing "+template_series_desc + " "+subject.missing);
                        }
                    }
                };
                //
                ///////////////////////////////////////////////////////////////////////
            }
        }
    }
}

function setup_affix($scope, affix) {
    //eneble affix
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
                $scope.content_affix = true;
                affix.style.top = "0px";
            });
        }
    }
    
    //TODO - this is recent page specific..
    //find first subject displayed
    var it = null;
    $(".subject, .template").each(function(id, subject) {
        if(it) return; //already found
        if($(subject).offset().top >= window.scrollY) {
            it = subject;
        }
    });
    //and update inview
    if(it && $scope.inview_id != it.id) $scope.$apply(function() {
        $scope.inview_id = it.id;
    });
}

app.controller('RecentController', ['$scope', 'appconf', 'toaster', '$http', 'jwtHelper', 'serverconf', 'scaMessage', '$anchorScroll', '$document', '$window', '$location',
function($scope, appconf, toaster, $http, jwtHelper, serverconf, scaMessage, $anchorScroll, $document, $window, $location) {
    $scope.appconf = appconf;
    scaMessage.show(toaster);
    serverconf.then(function(_serverconf) { $scope.serverconf = _serverconf; });

    var jwt = localStorage.getItem(appconf.jwt_id);
    if(jwt) { $scope.user = jwtHelper.decodeToken(jwt); }

    $scope.query_limit = appconf.recent_study_limit || 200;
    $scope.view_mode = "tall";

    load();

    var affix = document.getElementById("affix");
    if(affix) $document.on('scroll', function() {
        setup_affix($scope, affix);
    });

    //reload data if user invalidate data (like QC)
    $scope.$on("exam_invalidated", function(event, msg) {
        load();
    });


    function load() {
        $http.get(appconf.api+'/study/query', {params: {
            skip: 0, 
            limit: $scope.query_limit,
            where: {
                //show all for recent page
                //deprecated_by: {$exists: false}, //only look for the latest series inside series_desc
                //isexcluded: false, 
            },
        }})
        .then(function(res) {
            organize($scope, res.data);
            
            //do some extra processing for each subject
            for(var research_id in $scope.org) {
                var modalities = $scope.org[research_id];
                for(var modality_id in modalities) {
                    var modality = modalities[modality_id];
                    for(var subject_id in modality.subjects) {
                        var subject = modality.subjects[subject_id];
                        
                        //reset counter
                        subject.non_qced = 0;
                        subject.oks = 0;
                        subject.errors = 0;
                        subject.warnings = 0;
                        subject.notemps = 0;
                        
                        //count number of status for each subject
                        for(var series_desc in subject.serieses) {
                            var series_group = subject.serieses[series_desc];
                            for(var exam_id in series_group.exams) {
                                var serieses = series_group.exams[exam_id];
                                serieses.forEach(function(series, idx) {
                                    //if(idx > 0) return; //only count the first (latest) series
                                    if(series.deprecated_by) return; //only count non-deprecated series
                                    if(series.subject == "037_S_4410") console.dir(series);
                                    /*
                                    if(series.deprecated_by) {
                                        console.log("0 idx but deprecated..");
                                        console.dir(serieses);
                                    }
                                    */
                                    if(series.qc) {
                                        //decide the overall status(with error>warning>notemp precedence) for each series and count that.. 
                                        if(series.qc.errors && series.qc.errors.length > 0) {
                                            subject.errors++; 
                                        } else if (series.qc.warnings && series.qc.warnings.length > 0) {
                                            subject.warnings++; 
                                        } else if (series.qc.notemps > 0) {
                                            subject.notemps++; 
                                        } else subject.oks++;
                                    } else {
                                        subject.non_qced++;
                                    }
                                });
                            }
                        }
                    }
                }
            }
    
            if($scope.qcing) setTimeout(load, 1000*10);
        }, function(res) {
            if(res.data && res.data.message) toaster.error(res.data.message);
            else toaster.error(res.statusText);
        });
    }
}]);

app.controller('ResearchRedirectController', ['$scope', 'appconf', 'toaster', 'researches', '$location',
function($scope, appconf, toaster, researches, $location) {
    researches.getFirst().then(function(first) {
        if(first) {
            $location.path("/research/"+first._id);
        } else {
            toaster.error("You don't have access to any IIBISID");
            $location.path("/");
        }
    });
}]);

app.controller('ResearchController', ['$scope', 'appconf', 'toaster', '$http', 'jwtHelper', '$location', 'serverconf', 'scaMessage', '$anchorScroll', '$document', '$window', '$routeParams', 'researches', '$route',
function($scope, appconf, toaster, $http, jwtHelper, $location, serverconf, scaMessage, $anchorScroll, $document, $window, $routeParams, researches, $route) {
    $scope.appconf = appconf;
    scaMessage.show(toaster);
    serverconf.then(function(_serverconf) { $scope.serverconf = _serverconf; });
    var jwt = localStorage.getItem(appconf.jwt_id);
    if(jwt) $scope.user = jwtHelper.decodeToken(jwt);

    //unlike all other views, all exam can contain a lot of exams.. so it makes sense to display it wide mode
    $scope.view_mode = "wide";

    var lastRoute = $route.current;
    $scope.$on('$locationChangeSuccess', function(event) {
        $routeParams = $route.current.params;
        if($route.current.$$route.controller === 'ResearchController') {
            $route.current = lastRoute;
            load_series();
        }
    });

    researches.getAll().then(function(researches) {
        $scope.researches = researches;
        $scope.researches_filtered = $scope.researches;
        load_series();
    });

    $scope.$on("exam_invalidated", function(event, msg) {
        load_series();
    });

    /* broken..
    var affix = document.getElementById("affix");
    if(affix) $document.on('scroll', function() {
        setup_affix($scope, affix);
    });
    */

    function load_series() {
        if(!$routeParams.researchid) return; //could happen if user move away from this route by still waiting for callback
        $scope.research_id = $routeParams.researchid;
        $http.get(appconf.api+'/study/byresearchid/'+$scope.research_id)
        .then(function(res) {
            $scope.series_count = res.data.studies.length;
            organize($scope, res.data);
            if($scope.qcing) setTimeout(load_series, 1000*10);
        }, function(res) {
            if(res.data && res.data.message) toaster.error(res.data.message);
            else toaster.error(res.statusText);
        });
    }

    $scope.$watch("research_filter", function(filter) {
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
    });
}]);

app.component('exams', {
    templateUrl: 't/components/exams.html',
    controller: function($scope, appconf, $window, $http, toaster, $interval) { 
        var $ctrl = this;

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
        this.reqc = function(exam_id) {
            $http.post(appconf.api+'/study/reqcbyexamid/'+exam_id)
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
    $scope.query_limit = appconf.qc_study_limit || 200;
    $scope.view_mode = "tall";

    //construct query
    var where = {
        deprecated_by: {$exists: false}, //only look for the latest series inside series_desc
        isexcluded: false, 
    };
    switch(parseInt($routeParams.level)) {
    case 1:
        //var where = {qc1_state: {$exists: false}};
        where.qc1_state = 'fail';
        break;
    case 2:
        where.qc2_state = {$exists: false};
        break;
    default:
        toaster.error("Unknown QC level "+$routeParams.level);
    }
    load();

    $scope.$on("exam_invalidated", function(event, msg) {
        load();
    });

    function load() {
        $http.get(appconf.api+'/study/query', {params: {
            skip: 0, 
            limit: $scope.query_limit,
            where: where,
        }})
        .then(function(res) {
            organize($scope, res.data);
            if($scope.qcing) setTimeout(load, 1000*10);
        }, function(res) {
            if(res.data && res.data.message) toaster.error(res.data.message);
            else toaster.error(res.statusText);
        });
    }
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
    $scope.changestate = function(level, state, $event) {
        var comment = null;
        //TODO - user can disable prompt via browser.. also, canceling doesn't prevent user from switching the ui-button state
        //I should implement a bit more form like interface for state change
        if(state && state != "accept") {
            comment = prompt("Please enter comment for this state change");
            if(!comment) {
                $event.preventDefault();
                //$event.stopPropagation();
                return;
            }
        }

        $http.post(appconf.api+'/study/qcstate/'+$routeParams.seriesid, {level: level, state: state, comment: comment})
        .then(function(res) {
            if(level == 1) $scope.data.series.qc1_state = state;
            if(level == 2) $scope.data.series.qc2_state = state;
            $scope.data.series.events.push(res.data.event);
            toaster.success(res.data.message);
        }, function(res) {
            if(res.data && res.data.message) toaster.error(res.data.message);
            else toaster.error(res.statusText);
        });
    }
    $scope.select_template = function(item) {
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
        $http.post(appconf.api+'/study/reqc/'+$routeParams.seriesid)
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

    $http.get(appconf.api+'/research', {params: {admin: true}})
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


