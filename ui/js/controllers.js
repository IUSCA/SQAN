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

app.controller('RecentController', ['$scope', 'appconf', 'toaster', '$http', 'jwtHelper', '$location', 'serverconf', 'scaMessage', '$anchorScroll', '$document', '$window',
function($scope, appconf, toaster, $http, jwtHelper, $location, serverconf, scaMessage, $anchorScroll, $document, $window) {
    $scope.appconf = appconf;
    scaMessage.show(toaster);
    serverconf.then(function(_serverconf) { $scope.serverconf = _serverconf; });

    var jwt = localStorage.getItem(appconf.jwt_id);
    if(jwt) { $scope.user = jwtHelper.decodeToken(jwt); }

    $http.get(appconf.api+'/study/query', {params: {
        skip: 0, 
        limit: 600
    }})
    .then(function(res) {
        //TODO - maybe move all these logics to api?
        var iibisids = {};
        res.data.iibisids.forEach(function(research) {
            iibisids[research._id] = research;
        });
       
        //serises catalog (organized under Modality)
        //var serieses = res.data.serieses;

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
                    //_detail: serieses[research_detail.Modality][study.series_desc],
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
                        //var series_detail = serieses[modality._detail.Modality][series_desc];
                        //if(series_detail.excluded) continue;
                        for(var study_id in series.studies) {
                            var study = series.studies[study_id];
                            if(study._excluded) {
                                series._excluded = true;
                                continue;
                            }
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

        //find missing series 
        for(var iibisid in $scope.iibisids) {
            var research = $scope.iibisids[iibisid];
            for(var modality_id in research.modalities) {
                var modality = research.modalities[modality_id];
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

        //debug
        //console.log("$scope.iibisids dump");
        //console.dir($scope.iibisids);
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

    $scope.openstudy = function(study_id) {
        $location.path("/study/"+study_id);
        //$window.open("#/study/"+study_id); //works but it opens separate window for same url..
    }
    $scope.opentemplate = function(id) {
        $location.path("/template/"+id);
    }
    $scope.scrollto = function(id) {
        $anchorScroll(id);
    }
}]);

app.controller('StudyController', ['$scope', 'appconf', 'toaster', '$http', 'jwtHelper', '$location', 'serverconf', '$routeParams', 'scaMessage', 'users',
function($scope, appconf, toaster, $http, jwtHelper,  $location, serverconf, $routeParams, scaMessage, users) {
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
        console.dir(res.data);
    }, function(res) {
        if(res.data && res.data.message) toaster.error(res.data.message);
        else toaster.error(res.statusText);
    });
    
    //load userprofiles for comments..
    //TODO loading all user isn't stupid.. just load the users who are authors of comments
    users.then(function(_users) { $scope.users = _users; });

    //TODO this needs some overhawling
    function computeColor(image) {
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
                    if(warning.k) $scope.image_warnings[warning.k] = warning;
                    else $scope.other_warnings.push(warning);
                });
            }
        
            //if there is no error to show, show all headers by default
            if($scope.image_detail.qc.errors == 0 && $scope.image_detail.qc.warnings == 0) {
                $scope.show_all_headers = true;
            } else {
                $scope.show_all_headers = false;
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

app.controller('AdminController', ['$scope', 'appconf', 'toaster', '$http', 'jwtHelper', 'serverconf', 'scaMessage', 'users',
function($scope, appconf, toaster, $http, jwtHelper, serverconf, scaMessage, users) {
    $scope.appconf = appconf;
    scaMessage.show(toaster);
    serverconf.then(function(_serverconf) { $scope.serverconf = _serverconf; });

    var jwt = localStorage.getItem(appconf.jwt_id);
    if(jwt) { $scope.user = jwtHelper.decodeToken(jwt); }

    $http.get(appconf.api+'/researches/')
    .then(function(res) {
        /*
        res.data.forEach(function(research) {
            research.users = [];
        });
        */
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
        $http.get(appconf.api+'/acl/iibisid')
        .then(function(res) {
            $scope.acl = res.data;
            $scope._acl = {};
            $scope.iibisids.forEach(function(id) {
                if($scope.acl[id] == undefined) {
                    $scope.acl[id] = {users: []};
                } 
    
                //convert user id to object
                $scope._acl[id] = [];
                $scope.acl[id].users.forEach(function(sub) {
                    $scope._acl[id].push($scope.users[sub]);
                });
            });
        }, function(res) {
            if(res.data && res.data.message) toaster.error(res.data.message);
            else toaster.error(res.statusText);
        });
    });

    //load all users used to populate the user list
    users.then(function(_users) {
        $scope.users = _users;
        $scope.users_a = [];
        for(var sub in $scope.users) {
            $scope.users_a.push($scope.users[sub]);
        }
    });
    $scope.update_acl = function() {

        //convert object to id
        for(var id in $scope._acl) {
            var users = $scope._acl[id];
            var ids = [];
            users.forEach(function(user) {
                ids.push(user.sub);
            });
            $scope.acl[id].users = ids;
        };

        $http.put(appconf.api+'/acl/iibisid', $scope.acl)
        .then(function(res) {
            $scope.form.$setPristine();
            //$location.url("/configs");
            toaster.success("Updated Successfully!");
        }, function(res) {
            if(res.data && res.data.message) toaster.error(res.data.message);
            else toaster.error(res.statusText);
        });
    }
}]);

