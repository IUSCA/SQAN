app.controller('HeaderController', 
function($scope, appconf, $route, toaster, $http, jwtHelper, serverconf, $window, $location, $timeout) {
    $scope.title = appconf.title;
    $scope.active_menu = "unknown";

    serverconf.then(function(_c) { $scope.serverconf = _c; });


    function update_jwt(jwt) {
        if(!jwt) return;
        $scope.user = jwtHelper.decodeToken(jwt); 
        $scope.user.isadmin = ($scope.user.scopes.dicom.indexOf('admin') !== -1)
    }

    //pull old jwt..
    var jwt = localStorage.getItem(appconf.jwt_id);
    update_jwt(jwt);
    //but refresh it immediately
    refresh_jwt();
    function refresh_jwt() {
        console.log("refreshing token");
        $http.post(appconf.auth_api+'/refresh').then(function(res) {
            var jwt = res.data.jwt;
            localStorage.setItem(appconf.jwt_id, jwt);
            update_jwt(jwt);
            //$timeout(refresh_jwt, 60*1000);
        }, $scope.toast_error);
    }

    //TODO - it doesn't make sense that these exist here..
    $scope.openstudy = function(id) {
        $window.open("#/series/"+id, "study:"+id);
    }
    $scope.opentemplate = function(id) {
        $window.open("#/template/"+id,  "tepmlate:"+id);
    }

    $scope.opentab = function(page) {
        $window.open(page);
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
                $scope.count($scope.org);  //TODO recount the entire thing is too expensive? maybe use $timeout?
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
    
    $scope.count = function(org) {
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
                        if(series_group._isexcluded) continue;
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

    $scope.toast_error = function(res) {
        if(res.data && res.data.message) toaster.error(res.data.message);
        else toaster.error(res.statusText);
    }
});

app.controller('AboutController', 
function($scope, appconf, toaster, $http, serverconf) {
    $scope.appconf = appconf;
    $scope.$parent.active_menu = "about";
    //scaMessage.show(toaster);
    serverconf.then(function(_serverconf) { $scope.serverconf = _serverconf; });
});

app.controller('ResearchController', 
function($scope, appconf, toaster, $http, $location, serverconf, $document, $window, $routeParams, $route) {
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
        $location.update_path("/research/"+research._id); 
        
        //load research detail
        console.log("loading series with research_id:"+research._id);
        $scope.modality = null;
        $scope.loading = true;
        $http.get(appconf.api+'/series/query', {params: {
            //limit: $scope.query_limit,
            limit: 5000000,
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

            if(modality) {
                //now bind to this modality
                $scope.event_bind({
                    ex: "dicom.series",
                    key: modality._detail._id+".#"
                });
            } else {
                //probably empty modality
            }
        }, function(res) {
            $scope.loading = false;
            $scope.toast_error(res);
        });
    }

    //load all research entries
    $scope.loading_research = true;
    $http.get(appconf.api+'/research')
    .then(function(res) {
        $scope.loading_research = false;
        
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
    }, $scope.toast_error);

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
    $scope.show_researches = function(researches) {
        for(var i in researches) {
            var research = researches[i]; 
            return $scope.show_research(research);
        }
        return false;
    }
    $scope.show_research = function(research) {
        if(!$scope.research_filter) return true; 
        if(~research.IIBISID.toLowerCase().indexOf($scope.research_filter)) return true;
        if(~research.StationName.toLowerCase().indexOf($scope.research_filter)) return true;
        if(~research.Modality.toLowerCase().indexOf($scope.research_filter)) return true;
        if(research.radio_tracer && ~research.radio_tracer.toLowerCase().indexOf($scope.research_filter)) return true;
        return false;
    }

    $scope.$watch("research_filter", function(filter) {
        //hide selection if the selected research gets filtered out
        if(!$scope.selected) return;
        if(!$scope.show_research($scope.selected)) {
            $scope.selected = null;
        }
        /*
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
        */
    });
});

app.controller('DumpController',
function($scope, appconf, toaster, $http, $location, serverconf, $document, $window, $routeParams, $timeout) {
    $scope.appconf = appconf;
    var where = {};
    $scope.exams = [];
    load();
    function load() {
        $scope.loading_series = true;  //TODO: why load series instead of exams???
        $http.get(appconf.api + '/exam/query', {
            params: {
                skip: 0,
                limit: 5000000,
                where: where,
            }
        })
        .then(function (res) {
            console.log(res.data);
            $scope.exams = res.data;
        }, function (err) {
            console.log(err);
        });
    };
});

app.controller('HandlerController',
function($scope, appconf, toaster, $http, $location, serverconf, $document, $window, $routeParams, $timeout) {
    $scope.appconf = appconf;
    $scope.model = {};
    $scope.model.hoverrow = '';

    $scope.response_types = [
        {
            name: 'none',
            style: 'info'
        },
        {
            name: 'log',
            style: 'info'
        },
        {
            name: 'warn',
            style: 'warning'
        },
        {
            name: 'error',
            style: 'danger'
        }
    ];

    $scope.handler_types = [
        {
            name: 'IGNORE',
            default_response: 'log',
            desc: 'Do not do any comparisons on this key'
        },
        {
            name: 'IGNORE_SERIES',
            default_response: 'log',
            desc: 'Do not run QC tests on series that match the given key (wildcards OK)',
        },
        {
            name: 'MISSING_OK',
            default_response: 'log',
            desc: 'OK for this key to exist in template but not in qc-image'
        },
        {
            name: 'EXACT_MATCH',
            default_response: 'error',
            desc: 'qc-value must match template value exactly'
        },
        {
            name: 'PERCENT_DIFF',
            default_response: 'error',
            default_value: 0.1,
            desc: 'Check that qc-value matches template value within +/- n%'
        },
        {
            name: 'ABSOLUTE_DIFF',
            default_response: 'error',
            default_value: 0.1,
            desc: 'Check that qc-value matches template value within +/- n'
        },
        {
            name: 'MINIMUM',
            default_response: 'warn',
            default_value: 0.1,
            desc: 'Check that qc-value is greater than n'
        },
        {
            name: 'MAXIMUM',
            default_response: 'warn',
            default_value: 0.1,
            desc: 'Check that qc-value is less than n'
        },
        {
            name: 'SUBSTRING_PRESENT',
            default_response: 'warn',
            default_value: '',
            desc: 'Check that qc-value contains given string'
        },
        {
            name: 'SUBSTRING_MISSING',
            default_response: 'warn',
            default_value: '',
            desc: 'Check that qc-value does not contain given string'
        }
    ];

    $scope.default_key = {
        'key': 'NewKey',
        'type': 'IGNORE'
    };

    $scope.handler_ids = ['IGNORE','MISSING_OK','IGNORE_SERIES','EXACT_MATCH','PERCENT_DIFF','ABSOLUTE_DIFF','MINIMUM','MAXIMUM','SUBSTRING_PRESENT','SUBSTRING_MISSING'];

    $scope.cloneme = function(target, row, idx) {
        var newrow = angular.copy(row);
        target.splice(idx, 0, newrow);
        console.log("cloning ");
    };

    $scope.removeme = function(target, idx) {
        target.splice(idx, 1);
        console.log("removing");
    };

    $scope.revert = function(target) {
        console.log(target);
        target.handlers = angular.copy($scope.originals[target._id].handlers);
        console.log("reverting");
    };

    $scope.newrow = function(target) {
        target.splice(0, 0, angular.copy($scope.default_key));
        console.log("made a new row");
    };

    $scope.addnote = function(target) {
        if(target.notes === undefined) {
            target.notes = [];
        }
        console.log($scope.user);

        target.notes.push(
            {
                text: "New note",
                user: $scope.user.profile.username,
                timestamp: Date.now()
            }
        );
    };

    $scope.save = function(target) {

        $http.post(appconf.api + '/handler/update/' + target._id, target)
            .then(function(res) {
                console.log(res);
                toaster.success("Updated Successfully!");
            }, $scope.toast_error);
    };

    $scope.selected = false;
    $scope.select = function(h) {
        if($scope.selected && $scope.selected !== $scope.originals[$scope.selected._id]){
            if(confirm("Do you want to abandon unsaved changes?")) {
                $scope.selected = h;
                $scope.myform.$setPristine();
            }
        } else {
            $scope.selected = h;
        }
    };

    $scope.updateHandlerType = function(h) {
        if(h.name === 'IGNORE'){
            h.response = undefined;
            h.value = undefined;
            return
        };

        $scope.handler_types.forEach(function(ht){
            if(ht.name == h.type){
                if(h.response === undefined && ht.default_response !== undefined){
                    h.response = ht.default_response;
                };
                console.log(h.value, ht.value);
                if(h.value === undefined && ht.default_value !== undefined){
                    h.value = ht.default_value;
                };
            }
        });
    };

    load();
    $scope.handlers;
    $scope.originals = {};
    function load() {
        $http.get(appconf.api + '/handler', {})
        .then(function (res) {
            console.log(res.data);
            $scope.handlers = res.data;

            for(h of res.data) {
                $scope.originals[h._id] = angular.copy(h);
            };
        });
    };
});

app.controller('ExamsController',
    function($scope, appconf, toaster, $http, $location, serverconf, $document, $window, $routeParams, $timeout) {
        $scope.appconf = appconf;
        serverconf.then(function(_serverconf) { $scope.serverconf = _serverconf; });

        $scope.selected = null;
        $scope.selected_modality = null;
        $scope.$parent.active_menu = "exams"
        $scope.view_mode = "tall";
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
            $http.get(appconf.api+'/series/query', {params: {
                    skip: 0,
                    limit: 5000000,
                    where: where,
                }})
                .then(function(res) {
                    console.log(res.data);
                    $scope.selected = res.data[research.IIBISID][modality_id];

                    window.scrollTo(0, 0);

                    // var url = "/qcnew/" + $routeParams.level + "/" + modality.research._id;
                    // if (subjectuid) url += "/" + subjectuid;
                    // $location.update_path(url);

                    handle_scroll();

                    function handle_scroll() {
                        if (!subjectuid) return;
                        console.log("handling scroll " + subjectuid);
                        var pos = $('#' + subjectuid.replace(/\./g, '\\.')).position();
                        if (pos) {
                            window.scrollTo(0, pos.top - 85);
                        } else {
                            //item not loaded yet.. wait
                            $timeout(handle_scroll, 1000, false);
                        }
                    }

                    $scope.event_bind({
                        ex: "dicom.series",
                        key: research._id + ".#"
                    });
                }, function(err) {
                    console.log(err);
                });
        };


        //construct query

        function load(where) {
            var sortby = {};
            switch($scope.search.sort) {
                case "dateup":
                    sortby.date = -1;
                    break;
                case "datedown":
                    sortby.date = 1;
                    break;
                case "iibis":
                    sortby.IIBISID = -1;
                    break
                default:
                    sortby.date = -1;
            }
            $scope.selected = null;
            $scope.loading_series = true;
            $http.get(appconf.api + '/exam/query', {
                params: {
                    skip: 0,
                    limit: 5000000,
                    where: where,
                    sort: sortby
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
                    where.date = {$gt: d};
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
                if($scope.show_modality(iibisid, research.research.Modality)) return true;
            }
            return false;
        };

        $scope.show_modality = function(iibisid, modality) {
            if(!$scope.modalities[modality].display) return false;
            if(!$scope.research_filter) return true;
            if(~iibisid.toLowerCase().indexOf($scope.research_filter.toLowerCase())) return true;
            if(~modality.toLowerCase().indexOf($scope.research_filter.toLowerCase())) return true;
            return false;
        };

    });

app.controller('QCController', 
function($scope, appconf, toaster, $http, $location, serverconf, $document, $window, $routeParams, $timeout) {
    $scope.appconf = appconf;
    serverconf.then(function(_serverconf) { $scope.serverconf = _serverconf; });

    $scope.selected = null;
    $scope.$parent.active_menu = "qc"+$routeParams.level;
    $scope.view_mode = "tall";
    $scope.show_deprecated = true;
    $scope.serieses_count = 0;

    $scope.select = function(modality, subjectuid) {
        console.log(modality);
        $scope.selected = modality;
        window.scrollTo(0,0); 

        var url = "/qc/"+$routeParams.level+"/"+modality._detail._id;
        if(subjectuid) url += "/"+subjectuid;
        $location.update_path(url);

        handle_scroll();
        function handle_scroll() {
            if(!subjectuid) return;
            console.log("handling scroll "+subjectuid);
            var pos = $('#'+subjectuid.replace(/\./g, '\\.')).position();
            if(pos) {
                window.scrollTo(0,pos.top-85); 
            } else {
                //item not loaded yet.. wait
                $timeout(handle_scroll, 1000, false);
            }
        }

        $scope.event_bind({
            ex: "dicom.series",
            key: modality._detail._id+".#"
        });
    }

    //construct query
    var where = {};
    switch($routeParams.level) {
    case "all":
        break;
    case "recent":
        var d = new Date();
        d.setDate(d.getDate() - (appconf.recent_study_days||300));
        where.StudyTimestamp = {$gt: d};
        break;
    case "1":
        where.deprecated_by = {$exists: false};
        where.isexcluded = false;
        where.$and  = [
            {qc1_state:{$ne:"autopass"}},
            {qc1_state:{$ne:"accept"}}
        ];
        break;
    case "2":
        where.deprecated_by = {$exists: false};
        where.isexcluded = false;
        where.qc2_state = {$exists: false};
        break;
    default:
        toaster.error("Unknown QC level "+$routeParams.level);
    }

    $scope.recentrange = (appconf.recent_study_days||300);

    $scope.ecount = 0;

    load();
    function load() {
        $scope.loading_series = true;  //TODO: why load series instead of exams???
        $http.get(appconf.api+'/series/query', {params: {
            skip: 0, 
            limit: 5000000,
            where: where,
        }})
        .then(function(res) {
            $scope.org = res.data;
            console.log(res.data);
            $scope.count($scope.org);
            $scope.scan_count = 0;
            $scope.modalities = {};

            //select first modality or selected by user
            for(var iibisid in $scope.org) {
                var modalities = $scope.org[iibisid];
                for(var modality_id in modalities) {
                    var modality = modalities[modality_id];
                    if(!$scope.modalities[modality._detail.Modality]){
                        $scope.modalities[modality._detail.Modality] = {display: true, count: 0}
                    }
                    if($routeParams.researchid) {
                        if(modality._detail._id == $routeParams.researchid) {
                            //selecte first modality under research user specified
                            if(!$scope.selected) $scope.select(modality, $routeParams.subjectid);
                        }
                    } else {
                        if(!$scope.selected) $scope.select(modality);
                    }

                    //while at it, create serieses catalog
                    $scope.serieses = {};
                    for(var subject in modality.subjects) {
                        if (Object.keys(modality.subjects[subject].serieses).length < 1) continue;
                        $scope.scan_count++; //count the number of subjects in each modality in each research series
                        $scope.modalities[modality._detail.Modality].count++;
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
            console.log(Object.keys($scope.serieses));
            $scope.loading_series = false;
        }, $scope.toast_error);
    };

    $scope.moreOne = function(counter) {
        $scope[counter]++;
    };
 
    //these are duplicate of show_XXX for RecentController, but putting this on PageController somehow disables filtering
    //used to apply filtering capability
    $scope.show_iibis = function(iibisid, research) {
        for(var modality_id in research) {
            if($scope.show_modality(iibisid, modality_id, research[modality_id])) return true;
        }
        return false;
    };

    $scope.show_modality = function(iibisid, modality_id, modality) {
        for(var subject_desc in modality.subjects) {
            //console.log(modality);
            if(!$scope.modalities[modality._detail.Modality].display) return false;
            if($scope.show_subject(iibisid, modality_id, subject_desc)) return true;
        }
        return false;
    }

    $scope.show_subject = function(iibisid, modality_id, subject_desc) {
        if(Object.keys($scope.org[iibisid][modality_id].subjects[subject_desc].serieses).length < 1) return false;
        if(!$scope.research_filter) return true;
        if(~iibisid.toLowerCase().indexOf($scope.research_filter)) return true;
        if(~modality_id.toLowerCase().indexOf($scope.research_filter)) return true;
        if(~subject_desc.toLowerCase().indexOf($scope.research_filter)) return true;
        return false;
    }

    $scope.$watch("research_filter", function(filter) {
        //hide selection if the selected research gets filtered out
        if(!$scope.selected) return;
        var _detail = $scope.selected._detail;
        if(!$scope.show_modality(_detail.IIBISID, _detail.modality_id, $scope.selected)) {
            $scope.selected = null;
        }
    });

    $scope.reqc = function() {
        $http.post(appconf.api+'/research/reqc', {_id:$scope.selected._detail._id})
            .then(function(res) {
                toaster.success(res.data.message);
            }, $scope.toast_error);
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
        }, $scope.toast_error);
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
                    if(error.k) {   
                        $scope.image_errors[error.k] = error;
                        if(!$scope.image_detail.headers[error.k]) $scope.image_detail.headers[error.k] = undefined; //so that I can display *missing*
                    }
                    else $scope.other_errors.push(error);
                });
                res.data.qc.warnings.forEach(function(warning) {
                    if(warning.k) {
                        $scope.image_warnings[warning.k] = warning;
                        if(!$scope.image_detail.headers[warning.k]) $scope.image_detail.headers[warning.k] = undefined; //so that I can display *missing*
                    }
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
        }, $scope.toast_error);
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
        }, $scope.toast_error);
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
        }, $scope.toast_error);
    }
    $scope.select_template = function(item) {
        $scope.image_detail = null;
        $scope.active_image = null;
        $http.post(appconf.api+'/series/template/'+$routeParams.seriesid, {exam_id: item._id})
        .then(function(res) {
            load_series();
            toaster.success(res.data.message);
        }, $scope.toast_error);
    }
    $scope.reqc = function() {
        $scope.image_detail = null;
        $scope.active_image = null;
        $http.post(appconf.api+'/series/reqc/'+$routeParams.seriesid)
        .then(function(res) {
            load_series();
            toaster.success(res.data.message);
        }, $scope.toast_error);
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
    }, $scope.toast_error);

    $scope.load_template = function(template) {
        $scope.active_template = template;
        $http.get(appconf.api+'/template/inst/'+template._id)
        .then(function(res) {
            $scope.image_detail = res.data;
        }, $scope.toast_error);
    }
});


app.controller('DataflowController',
function($scope, appconf, toaster, $http, serverconf) {
    $scope.datasends = [];

    $http.get(appconf.api+'/dataflow')
        .then(function(res) {
            $scope.datasends = res.data;
        }, $scope.toast_error);
});


app.controller('SummaryController',
function($scope, appconf, toaster, $http, $window, $sce, serverconf) {
    $scope.$parent.active_menu = "rsummary";
    $scope.researches = [];
    $scope.research_detail = {};
    $scope.research_id = '';
    $scope.research = {
        selected: ''
    };

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

            console.log($scope.researches);
            console.log(res.data);
            $scope.research.selected = $scope.researches[0];
            $scope.getSummary();
        }, $scope.toast_error);


    $scope.trustAsHtml = function(value) {
        return $sce.trustAsHtml(value);
    };

    $scope.getIIBIS = function() {
        var url = appconf.api+'/iibis/'+$scope.research.selected.id;
        console.log(url);
        $http.get(url)
            .then(function(res) {
                console.log(res);
                $scope.research_detail = res.data[0];
            }, $scope.toast_error);
    };

    $scope.getSummary = function() {
        $scope.summary = {};
        $scope.subjects = [];
        $scope.getIIBIS();
        angular.forEach($scope.research.selected.studies, function(s){
            console.log(s);
            $http.get(appconf.api+'/research/summary/'+s._id)
                .then(function(res) {
                    console.log(s);
                    var label = s.Modality;
                    if(s.radio_tracer !== null){
                        label += ' - ' + s.radio_tracer;
                    }

                    $scope.summary[label] = res.data;
                    console.log(res.data);
                    angular.forEach(res.data.subjects, function(v, k){
                        if($scope.subjects.indexOf(k) < 0){
                            $scope.subjects.push(k);
                        }
                    });
                }, $scope.toast_error);
        });

        console.dir($scope.subjects);

    };

});


app.controller('TemplateSummaryController',
function($scope, appconf, toaster, $http, $location, serverconf) {
    
    $scope.$parent.active_menu = "tsummary";

    $scope.fields = ['IIBISID','Modality','StationName','radio_tracer','count'];
    $scope.fieldnames = ['IIBISID','Modality','Station Name','Radio Tracer','# Timestamps'];
    
    $scope.detailnames = ['Series Number','Series Description','Times used for QC','# Images'];

    $scope.sorting = {
        filter: '',
        fieldname: $scope.fieldnames[0]        
    };

    $scope.getTemplateSummary = function() {
        $http.get(appconf.api+'/templatesummary/istemplate').then(function(res) {
            $scope.templates = res.data;
            console.log($scope.templates.length + ' templates retrieved from exam db');
        }, function(err) {
            console.log("Error contacting API");
            console.dir(err);
        });       
    };
    $scope.getTemplateSummary();

    $scope.rowNumber = -1;
    $scope.indexDetails=-1; 

    $scope.templatesByTimestamp = function(research,index){
       
        $scope.showDetails = false;
        $scope.indexDetails=-1;

        if($scope.rowNumber!==index){
            
            $scope.rowNumber=index;
            $scope.templatebytimestamp = [];
            $scope.templatesUsed = [];

            $http.get(appconf.api+'/templatesummary/examids/'+research._id, {}).then(function(res) {
                console.log(res.data)                
                console.log(`Number of dates for this research -- ${res.data.length}`);                                                

                res.data.forEach(function(tbyt,j) {
                    var arrDetails = [];
                    $scope.templatesUsed[j] = 0;
                    tbyt.template_id.forEach(function(tid,i) {
                        var arrItems = {};                                            
                        arrItems['SeriesNumber'] = tbyt.SeriesNumber[i];
                        arrItems['series_desc'] = tbyt.series_desc[i];
                        arrItems['template_id'] = tid;

                        $http.get(appconf.api+'/templatesummary/series/'+tid, {}).then(function(res) {                            
                            if(res.data.length>0) {
                                arrItems['usedInQC'] = res.data[0].usedInQC;
                                $scope.templatesUsed[j]++;
                            }
                            else arrItems['usedInQC']=0                            
                        }, function(err) {
                            toaster.error("Error retrieving template details");
                            console.dir(err);
                        });

                        $http.get(appconf.api+'/templatesummary/imagecount/'+tid, {}).then(function(res) {                            
                            if(res.data.length>0) arrItems['imageCount']=res.data[0].imageCount
                            else arrItems['imageCount']=0                           
                        }, function(err) {
                            toaster.error("Error retrieving template details");
                            console.dir(err);
                        });
                        
                        arrDetails.push(arrItems)
                    })
                    var timestampObj = {};
                    timestampObj['date']=tbyt.date;
                    timestampObj['_id']=tbyt._id;
                    timestampObj['details']=arrDetails;
                    $scope.templatebytimestamp.push(timestampObj)
                })  
                console.log($scope.templatebytimestamp)
                console.log($scope.templatesUsed)
            }, function(err) {
                toaster.error("Error retrieving template details");
                console.dir(err);
            });                
        } else {$scope.rowNumber=-1};               
    }   

    $scope.templateDetails = function(timestamp,index){
        console.log('index  ' + index)
        console.log('indexDetails ' + $scope.indexDetails)       

        if($scope.indexDetails!==index){  
            $scope.indexDetails=index;            
            $scope.showDetails = true; 
            console.log(timestamp)           
            $scope.details = timestamp; 
        } else {
            $scope.indexDetails=-1;
            $scope.showDetails = false;
            $scope.details = [];
        }
    }  

    // $scope.fields = ['IIBISID','Modality','radio_tracer','count'];
    // $scope.fieldnames = ['IIBISID','Modality','Radio Tracer','# Timestamps'];
    
    // $scope.detailnames = ['Series Number','Series Description','Times used for QC','# Images'];

    // $scope.sorting = {
    //     filter: '',
    //     fieldname: $scope.fieldnames[0]        
    // };

    // $scope.getTemplateSummary = function() {
    //     $http.get(appconf.api+'/templatesummary/istemplate').then(function(res) {
    //         $scope.templates = res.data;
    //         console.log($scope.templates)
    //         console.log('templates retrieved from exam db');
    //     }, function(err) {
    //         console.log("Error contacting API");
    //         console.log(err);
    //     });       
    // };
    // $scope.getTemplateSummary();

    // $scope.rowNumber = -1;
    // $scope.indexDetails=-1;

    // $scope.templatesByTimestamp = function(research,index){        
    //     $scope.showDetails = false;
    //     $scope.indexDetails = -1;
    //     console.log(`show details is ${$scope.showDetails}`)

    //     if($scope.rowNumber!==index){
            
    //         $scope.rowNumber=index;

    //         $http.get(appconf.api+'/templatesummary/examids/'+research._id, {}).then(function(res) {
    //             console.log("we are here");
    //             console.log(res.data);
    //             $scope.templatebytimestamp = res.data;
    //             console.log(`Number of dates for this research -- ${$scope.templatebytimestamp.length}`);                                

    //             for(let j=0;j<$scope.templatebytimestamp.length;j++) {
                    
    //                 let usedInQC = [];
    //                 let imageCount = [];
    //                 let templateArr = $scope.templatebytimestamp[j];

    //                 for(let i=0;i<templateArr.template_id.length;i++){

    //                     let template_id = templateArr.template_id[i];
    //                     //console.log(template_id)

    //                     $http.get(appconf.api+'/templatesummary/series/'+template_id, {}).then(function(res) {
                            
    //                         if(res.data.length>0) {
    //                             //console.log(i + ' ' + res.data[0].usedInQC)
    //                             usedInQC.push(res.data[0].usedInQC);
    //                         } else {
    //                             usedInQC.push(0);
    //                         }
    //                         //console.log($scope.usedInQC)
    //                     }, function(err) {
    //                         toaster.error("Error retrieving template details");
    //                         console.dir(err);
    //                     });
    //                     $scope.templatebytimestamp[j].usedInQC = usedInQC;

    //                     $http.get(appconf.api+'/templatesummary/imagecount/'+template_id, {}).then(function(res) {
                            
    //                         if(res.data.length>0) {
    //                             //console.log(i + ' ' + res.data[0].usedInQC)
    //                             imageCount.push(res.data[0].imageCount);
    //                         } else {
    //                             imageCount.push(0);
    //                         }
    //                         //console.log($scope.usedInQC)
    //                     }, function(err) {
    //                         toaster.error("Error retrieving template details");
    //                         console.dir(err);
    //                     });
    //                     $scope.templatebytimestamp[j].imageCount = imageCount;
    //                 }
    //             }            
    //         }, function(err) {
    //             toaster.error("Error retrieving template details");
    //             console.dir(err);
    //         });                
    //     } else {$scope.rowNumber=-1};
    // }  
    

    // $scope.templateDetails = function(timestamp,index){
    //     console.log(index)       

    //     if($scope.indexDetails!==index){  
    //         console.log('inside function')          
    //         $scope.indexDetails=index;            
    //         $scope.showDetails = true; 
    //         console.log(timestamp)           
    //         $scope.details = timestamp;                      
    //     } else {
    //         $scope.indexDetails=-1;
    //         $scope.showDetails = false;
    //         $scope.details = [];
    //     }
    // }  
});

app.controller('AdminController', 
function($scope, appconf, toaster, $http, serverconf, groups) {
    $scope.appconf = appconf;
    $scope.$parent.active_menu = "admin";
    $scope._selected = {};
    $scope.selectall = false;
    serverconf.then(function(_serverconf) { $scope.serverconf = _serverconf; });

    $http.get(appconf.api+'/research', {params: {admin: true}})
    .then(function(res) {
        //find unique iibisids
        $scope.iibisids = [];
        res.data.forEach(function(research) {
            if(!~$scope.iibisids.indexOf(research.IIBISID)) $scope.iibisids.push(research.IIBISID);
        });

        groups.then(function(_groups) {
            $scope.groups = _groups;
            //conver to easy to lookup object
            $scope.groups_o = [];
            $scope.groups.forEach(function(group) {
                $scope.groups_o[group.id] = group;
            });
        });

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
        }, $scope.toast_error);
    }, $scope.toast_error);

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
        }, $scope.toast_error);
    };


    $scope.reqc = function() {
        var selected = [];
        angular.forEach($scope._selected, function(s,k){
            if(s) selected.push(k);
        });
        $http.post(appconf.api+'/research/reqc', {IIBISID: { '$in': selected}})
            .then(function(res) {
                toaster.success(res.data.message);
            }, $scope.toast_error);
    };

    $scope.toggle_selectall = function() {
        $scope.selectall = !$scope.selectall;
        angular.forEach($scope._selected, function(s, k){
            $scope._selected[k] = $scope.selectall;
        });
    };

    $scope.selectedCount = function() {
        var count = 0;
        angular.forEach($scope._selected, function(s){
            count += s ? 1 : 0;
        });
        return count;
    }

});


