'use strict';

app.controller('HeaderController', 
function($scope, appconf, $route, toaster, $http, jwtHelper, serverconf, $window, $anchorScroll, $location) {
    $scope.title = appconf.title;
    $scope.active_menu = "unknown";
    serverconf.then(function(_c) { $scope.serverconf = _c; });

    var jwt = localStorage.getItem(appconf.jwt_id);
    if(jwt) { $scope.user = jwtHelper.decodeToken(jwt); }

    //TODO - it doesn't make sense that these exist here..
    $scope.openstudy = function(id) {
        $window.open("#/series/"+id, "study:"+id);
    }
    $scope.opentemplate = function(id) {
        $window.open("#/template/"+id,  "tepmlate:"+id);
    }
    
    //open another page inside the app.
    $scope.openpage = function(page) {
        console.log("path to "+page);
        $location.path(page);
    }

    //relocate out of the app..
    $scope.relocate = function(url) {
        document.location = url;
    }

    if($scope.user) {
        $scope.serieses = {}; //make it easier to lookup series that needs to be updated
        
        //list of all event binds that user has requested so far
        $scope.event_binds = [];
        
        //start event streaming
        $scope.event = new ReconnectingWebSocket("wss:"+window.location.hostname+appconf.event_api+"/subscribe?jwt="+jwt);
        $scope.event.onopen = function(e) {
            console.log("eventws connection opened - binding:"+$scope.event_binds.length);
            $scope.event_binds.forEach(function(bind) {
                $scope.event.send(JSON.stringify({bind: bind}));
            });
        }
        $scope.event.onmessage = function(evt) {
            var data = JSON.parse(evt.data);
            //parse routing key
            var key = data.dinfo.routingKey;
            var keytokens = key.split(".");
            var research_id = keytokens[0];
            var exam_id = keytokens[1];
            var series_id = keytokens[2];

            //update the series 
            var series = $scope.serieses[series_id];
            if(!series) return; //RECENT UI doesn't load all series
            $scope.$apply(function() {
                series.qc = null; //could be missing
                for(var key in data.msg) series[key] = data.msg[key]; //update the rest
                //console.log("update for "+key);
                //console.log(JSON.stringify(series));
                count($scope.org);  //TODO recount the entire thing is too expensive? maybe use $timeout?
            });
            
            /*
            //assume it's series.. look for research that this information belongs to
            for(var iibisid in $scope.org) {
                for(var modality_id in $scope.org[iibisid]) {
                    var modality = $scope.org[iibisid][modality_id];
                    if(modality._detail._id == research_id) {
                        //found modality that update belongs to.. now find the series.
                        for(var 
                        //console.log("belongs to this");
                        //console.dir(modality);
                    }
                } 
            } 
            */
        }
        /*
        $scope.event.onmessage = function(json) {
            var e = JSON.parse(json.data);
            console.dir(e);
            if(e.msg) {
                var task = e.msg;
                $scope.$broadcast("task_updated", task);
            } else {
                console.log("unknown message from eventws");
                console.dir(e);
            }
        }
        */
        /*
        $scope.event.onclose = function(e) {
            console.log("eventws connection closed - should auto reconnect");
        }
        */

        $scope.event_bind = function(bind) {
            if(!$scope.event) return; //not initialized
            console.log("binding to "+bind.ex+"/"+bind.key);
            $scope.event_binds.push(bind); //to rebind on reconnect
            //if not connected yet, onopen should take care of it
            if($scope.event.readyState == 1) {
                $scope.event.send(JSON.stringify({bind: bind}));
            }
        }
    } 

});

app.controller('AboutController', 
function($scope, appconf, toaster, $http, serverconf) {
    $scope.appconf = appconf;
    $scope.$parent.active_menu = "about";
    //scaMessage.show(toaster);
    serverconf.then(function(_serverconf) { $scope.serverconf = _serverconf; });
});

/*
function compose_modalityid(research_detail) {
    return research_detail.Modality+"."+research_detail.StationName+"."+research_detail.radio_tracer;
}
*/


/*
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
*/

/*
app.controller('RecentController',
function($scope, appconf, toaster, $http, jwtHelper, serverconf, $anchorScroll, $document, $window, $location) {
    $scope.appconf = appconf;
    $scope.$parent.active_menu = "recent";
    serverconf.then(function(_serverconf) { $scope.serverconf = _serverconf; });
    $scope.selected = null;

    var jwt = localStorage.getItem(appconf.jwt_id);
    if(jwt) { $scope.user = jwtHelper.decodeToken(jwt); }

    $scope.query_limit = appconf.recent_study_limit || 200;
    $scope.view_mode = "tall";

    $scope.select = function(modality) {
        //console.log(modality);
        $scope.selected = modality;
        window.scrollTo(0,0); 
    }

    //load all recent series
    $http.get(appconf.api+'/series/query', {params: {
        skip: 0, 
        limit: $scope.query_limit,
        where: {
            //show all for recent page
            //deprecated_by: {$exists: false}, //only look for the latest series inside series_desc
            //isexcluded: false, 
        },
    }})
    .then(function(res) {
        //organize($scope, res.data);
        $scope.org = res.data;
        $scope.serieses_count = 0;
        
        //do some extra processing for each subject
        for(var research_id in $scope.org) {
            var modalities = $scope.org[research_id];
            for(var modality_id in modalities) {
                var modality = modalities[modality_id];
                if(!$scope.selected) $scope.selected = modality; //select first modality
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
                                if(series.deprecated_by) return; //only count non-deprecated series
                                //if(idx > 0) return; //only count the first (latest) series
                                if(series.qc) {
                                    //decide the overall status(with error>warning>notemp precedence) for each series and count that.. 
                                    if(series.qc.errors && series.qc.errors.length > 0) {
                                        subject.errors++; 
                                    } else if(series.qc.warnings && series.qc.warnings.length > 0) {
                                        subject.warnings++; 
                                    } else if(series.qc.notemps > 0) {
                                        subject.notemps++; 
                                    } else subject.oks++;
                                } else {
                                    subject.non_qced++;
                                }
                            });
                            $scope.serieses_count += serieses.length;
                        }
                    }
                }
            }
        }
        //if($scope.qcing) setTimeout(load, 1000*10);
    }, function(res) {
        if(res.data && res.data.message) toaster.error(res.data.message);
        else toaster.error(res.statusText);
    });
    
    //used to apply filtering capability (don't move these to $parent or filter change won't be applied)
    $scope.show_iibis = function(iibisid, research) {
        for(var modality_id in research) {
            if($scope.show_modality(iibisid, modality_id, research[modality_id])) return true;
        }
        return false;
    }
    $scope.show_modality = function(iibisid, modality_id, modality) {
        for(var subject_desc in modality.subjects) {
            if($scope.show_subject(iibisid, modality_id, subject_desc)) return true;
        }
        return false;
    }
    $scope.show_subject = function(iibisid, modality_id, subject_desc) {
        if(!$scope.research_filter) return true;
        if(~iibisid.toLowerCase().indexOf($scope.research_filter)) return true;
        if(~modality_id.toLowerCase().indexOf($scope.research_filter)) return true;
        if(~subject_desc.toLowerCase().indexOf($scope.research_filter)) return true;
        return false;
    }

});
*/

/*
app.controller('ResearchRedirectController', 
function($scope, appconf, toaster, researches, $location) {
    researches.getFirst().then(function(first) {
        if(first) {
            $location.path("/research/"+first._id);
        } else {
            toaster.error("You don't have access to any IIBISID");
            $location.path("/");
        }
    });
});
*/

app.controller('ResearchController', 
function($scope, appconf, toaster, $http, $location, serverconf, $anchorScroll, $document, $window, $routeParams, $route) {
    $scope.appconf = appconf;
    $scope.$parent.active_menu = "research";
    serverconf.then(function(_serverconf) { $scope.serverconf = _serverconf; });

    $scope.selected = null;

    //unlike all other views, all exam can contain a lot of exams.. so it makes sense to display it wide mode
    $scope.view_mode = "wide";

    /*
    var lastRoute = $route.current;
    $scope.$on('$locationChangeSuccess', function(event) {
        $routeParams = $route.current.params;
        if($route.current.$$route.controller === 'ResearchController') {
            $route.current = lastRoute;
        }
    });
    */

    $scope.select = function(research) {
        $scope.selected = research;
        
        //load research detail
        console.log("loading series with research_id:"+research._id);
        $scope.modality = null;
        $scope.loading = true;
        $http.get(appconf.api+'/series/query', {params: {
            //limit: $scope.query_limit,
            where: {
                research_id: research._id
                //show all for recent page
                //deprecated_by: {$exists: false}, //only look for the latest series inside series_desc
                //isexcluded: false, 
            },
        }})
        .then(function(res) {
            $scope.loading = false;

            //find modality that user wants to see
            for(var research_id in res.data) {
                var modalities = res.data[research_id];
                for(var modality_id in modalities) {
                    var modality = modalities[modality_id];
                    if(modality._detail._id == research._id) $scope.modality = modality;
                    
                    //while at it, create a catalog of all serieses
                    for(var subject in modality.subjects) {
                        for(var series_desc in modality.subjects[subject].serieses) {
                            var exams = modality.subjects[subject].serieses[series_desc].exams; 
                            for(var exam_id in exams) {
                                exams[exam_id].forEach(function(series) {
                                    $scope.serieses[series._id] = series;
                                }); 
                            }
                        }
                    }
                }
            }
            window.scrollTo(0,0); 

            //now bind to this modality
            $scope.event_bind({
                ex: "dicom.series",
                key: modality._detail._id+".#"
            });
        }, function(res) {
            $scope.loading = false;
            if(res.data && res.data.message) toaster.error(res.data.message);
            else toaster.error(res.statusText);
        });
    }

    //load all research entries
    $http.get(appconf.api+'/research')
    .then(function(res) {
        //organize records into IIBISID / (Modality+StationName+Radio Tracer)
        $scope.research_count = res.data.length;
        $scope.iibisids = {};
        res.data.forEach(function(rec) {
            if(!$scope.iibisids[rec.IIBISID]) $scope.iibisids[rec.IIBISID] = [];
            $scope.iibisids[rec.IIBISID].push(rec);

            //select user specified research or first one if not specified
            if($routeParams.researchid) {
                if(rec._id == $routeParams.researchid) $scope.select(rec); 
            } else {
                if(!$scope.selected) $scope.select(rec);
            }
        });
    }, function(res) {
        if(res.data && res.data.message) toaster.error(res.data.message);
        else toaster.error(res.statusText);
    })

    /*
    //load all researches that user has access to
    researches.getAll().then(function(researches) {
        $scope.researches = researches;
        //load_series();
    });
    */

    /* TODO I should use websocket feed through event service
    $scope.$on("exam_invalidated", function(event, msg) {
        load_series();
    });
    */

    
    //used to apply filter for /research
    $scope.show_researches = function(iibisid, researches) {
        for(var i in researches) {
            var research = researches[i]; 
            if($scope.show_research(iibisid, research)) return true;
        }
        return false;
    }
    $scope.show_research = function(iibisid, research) {
        if(!$scope.research_filter) return true; 
        if(~iibisid.toLowerCase().indexOf($scope.research_filter)) return true;
        if(~research.StationName.toLowerCase().indexOf($scope.research_filter)) return true;
        if(~research.Modality.toLowerCase().indexOf($scope.research_filter)) return true;
        if(research.radio_tracer && ~research.radio_tracer.toLowerCase().indexOf($scope.research_filter)) return true;
        return false;
    }

    /*
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
    */
});

app.component('exams', {
    templateUrl: 't/components/exams.html',
    bindings: {
        modality: '<',
        mode: '<', //view mode ('wide' / 'tall')
        subject: '<', //subject to show
    },
    controller: function(appconf, $window, $http, toaster, $interval) { 
        var $ctrl = this;

        this.openstudy = function(id) {
            $window.open("#/series/"+id, "study:"+id);
        }
        this.opentemplate = function(id) {
            $window.open("#/template/"+id);
        }
        this.reqc = function(exam_id) {
            $http.post(appconf.api+'/series/reqcbyexamid/'+exam_id)
            .then(function(res) {
                //$scope.$emit("exam_invalidated", {exam_id: exam_id});
                toaster.success(res.data.message);
            }, function(res) {
                if(res.data && res.data.message) toaster.error(res.data.message);
                else toaster.error(res.statusText);
            });
        }
        /*
        this.addcomment = function(exam_id) {
            var exam = $ctrl.exams[exam_id];
            $http.post(appconf.api+'/exam/comment/'+exam_id, {comment: exam.newcomment})
            .then(function(res) {
                if(!$ctrl.exams[exam_id].comments) $ctrl.exams[exam_id].comments = [];
                $ctrl.exams[exam_id].comments.push(res.data);
                exam.newcomment = "";
            }, function(res) {
                if(res.data && res.data.message) toaster.error(res.data.message);
                else toaster.error(res.statusText);
            });
        }
        */
    },
});

app.component('templates', {
    templateUrl: 't/components/templates.html',
    controller: function($window) { 
        console.log("init templates");
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

app.controller('QCController', 
function($scope, appconf, toaster, $http, $location, serverconf, $anchorScroll, $document, $window, $routeParams) {
    $scope.appconf = appconf;
    serverconf.then(function(_serverconf) { $scope.serverconf = _serverconf; });

    $scope.selected = null;
    $scope.$parent.active_menu = "qc"+$routeParams.level;
    $scope.view_mode = "tall";
    $scope.serieses_count = 0;
    var query_limit = 200; //will be overridden

    $scope.select = function(modality) {
        //console.log(modality);
        $scope.selected = modality;
        window.scrollTo(0,0); 

        $scope.event_bind({
            ex: "dicom.series",
            key: modality._detail._id+".#"
        });
    }


    //construct query
    var where = {};
    switch($routeParams.level) {
    case "recent":
        //just load all recent..
        if(appconf.recent_study_limit) query_limit = appconf.recent_study_limit;
        break;
    case "1":
        //var where = {qc1_state: {$exists: false}};
        //where.qc1_state = 'fail';
        if(appconf.qc_study_limit) query_limit = appconf.qc_study_limit;
        where.deprecated_by = {$exists: false};
        where.isexcluded = false;
        where.$and  = [
            {qc1_state:{$ne:"autopass"}},
            {qc1_state:{$ne:"accept"}}
        ];
        break;
    case "2":
        if(appconf.qc_study_limit) query_limit = appconf.qc_study_limit;
        where.deprecated_by = {$exists: false};
        where.isexcluded = false;
        where.qc2_state = {$exists: false};
        break;
    default:
        toaster.error("Unknown QC level "+$routeParams.level);
    }
    load();

    /* TODO I should use websocket feed through event service
    $scope.$on("exam_invalidated", function(event, msg) {
        load();
    });
    */


    function load() {
        $http.get(appconf.api+'/series/query', {params: {
            skip: 0, 
            limit: query_limit,
            where: where,
        }})
        .then(function(res) {
            $scope.org = res.data;
            count($scope.org);

            console.log("org");
            console.dir($scope.org);
        
            //select first modality
            for(var research_id in $scope.org) {
                var modalities = $scope.org[research_id];
                for(var modality_id in modalities) {
                    var modality = modalities[modality_id];
                    if(!$scope.selected) $scope.select(modality);
                    
                    //while at it, create a catalog of all serieses
                    for(var subject in modality.subjects) {
                        for(var series_desc in modality.subjects[subject].serieses) {
                            var exams = modality.subjects[subject].serieses[series_desc].exams; 
                            for(var exam_id in exams) {
                                exams[exam_id].forEach(function(series) {
                                    $scope.serieses[series._id] = series;
                                }); 
                            }
                        }
                    }
                }
            }
            $scope.serieses_count = Object.keys($scope.serieses).length;
            //if($scope.qcing) setTimeout(load, 1000*10);
        }, function(res) {
            if(res.data && res.data.message) toaster.error(res.data.message);
            else toaster.error(res.statusText);
        });
    }

    function count(org) {
        //do some extra processing for each subject
        for(var research_id in org) {
            var modalities = org[research_id];
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
                                if(series.deprecated_by) return; //only count non-deprecated series
                                //if(idx > 0) return; //only count the first (latest) series
                                if(series.qc) {
                                    //decide the overall status(with error>warning>notemp precedence) for each series and count that.. 
                                    if(series.qc.errors && series.qc.errors.length > 0) {
                                        subject.errors++; 
                                    } else if(series.qc.warnings && series.qc.warnings.length > 0) {
                                        subject.warnings++; 
                                    } else if(series.qc.notemps > 0) {
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
    }
 
    //these are duplicate of show_XXX for RecentController, but putting this on PageController somehow disables filtering
    //used to apply filtering capability
    $scope.show_iibis = function(iibisid, research) {
        for(var modality_id in research) {
            if($scope.show_modality(iibisid, modality_id, research[modality_id])) return true;
        }
        return false;
    }
    $scope.show_modality = function(iibisid, modality_id, modality) {
        for(var subject_desc in modality.subjects) {
            if($scope.show_subject(iibisid, modality_id, subject_desc)) return true;
        }
        return false;
    }
    $scope.show_subject = function(iibisid, modality_id, subject_desc) {
        if(!$scope.research_filter) return true;
        if(~iibisid.toLowerCase().indexOf($scope.research_filter)) return true;
        if(~modality_id.toLowerCase().indexOf($scope.research_filter)) return true;
        if(~subject_desc.toLowerCase().indexOf($scope.research_filter)) return true;
        return false;
    }
});

//used to be StudyController
app.controller('SeriesController', 
function($scope, appconf, toaster, $http,  $location, serverconf, $routeParams, users, $timeout) {
    $scope.appconf = appconf;
    //scaMessage.show(toaster);
    serverconf.then(function(_serverconf) { $scope.serverconf = _serverconf; });
    
    //load userprofiles for comments..
    //TODO loading all user is stupid.. just load the users who are authors of comments
    users.then(function(_users) { $scope.users = _users; });
    load_series();

    function load_series() {
        if(!$routeParams.seriesid) return; //probably the route changed since last time
        $http.get(appconf.api+'/series/id/'+$routeParams.seriesid)
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
        $http.post(appconf.api+'/series/comment/'+$routeParams.seriesid, {comment: $scope.newcomment})
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
        //if(state && state != "accept") {
        comment = prompt("Please enter comment for this state change");
        if(!comment) {
            $event.preventDefault();
            //$event.stopPropagation();
            return;
        }
        //}

        $http.post(appconf.api+'/series/qcstate/'+$routeParams.seriesid, {level: level, state: state, comment: comment})
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
        $http.post(appconf.api+'/series/template/'+$routeParams.seriesid, {exam_id: item._id})
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
        $http.post(appconf.api+'/series/reqc/'+$routeParams.seriesid)
        .then(function(res) {
            load_series();
            toaster.success(res.data.message);
        }, function(res) {
            if(res.data && res.data.message) toaster.error(res.data.message);
            else toaster.error(res.statusText);
        });
    }
});

app.controller('TemplateController',
function($scope, appconf, toaster, $http, $location, serverconf, $routeParams) {
    $scope.appconf = appconf;
    //scaMessage.show(toaster);
    serverconf.then(function(_serverconf) { $scope.serverconf = _serverconf; });

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
});

app.controller('AdminController', 
function($scope, appconf, toaster, $http, serverconf, groups) {
    $scope.appconf = appconf;
    $scope.$parent.active_menu = "admin";
    serverconf.then(function(_serverconf) { $scope.serverconf = _serverconf; });

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
});


