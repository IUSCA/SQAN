app.controller('HeaderController',
function($scope, appconf, $route, toaster, $http, jwtHelper, serverconf, $window, $location, $timeout) {
    $scope.title = appconf.title;
    $scope.active_menu = "unknown";
    $scope.$parent.appmode = appconf.mode !== undefined ? appconf.mode : 'prod';

    serverconf.then(function(_c) { $scope.serverconf = _c; });


    function update_jwt(jwt) {
        console.log(jwt);
        if(!jwt) return;
        $scope.user = jwtHelper.decodeToken(jwt);
        console.log($scope.user);
        $scope.user.isadmin = (~$scope.user.roles.indexOf('admin'))
    }

    //pull old jwt..
    var jwt = localStorage.getItem(appconf.jwt_id);
    update_jwt(jwt);
    // //but refresh it immediately
    $timeout(function() {
        console.log('rechecking jwt');
        var jwt = localStorage.getItem(appconf.jwt_id);
        update_jwt(localStorage.getItem(appconf.jwt_id))
    }, 1000);

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

    $scope.comment_form = {
        subject: 'Question/comment re:RADY-SCA ',
        name: $scope.user !== undefined ? $scope.user.profile.fullname : '',
        email: $scope.user !== undefined ? $scope.user.profile.email : '',
        message: ''
    };


    $scope.submit_comment = function() {
        console.log($scope.comment_form);
        try {

            $http.post(appconf.api+'/comment', $scope.comment_form)
                .then(function(res) {
                    if(res && res.data && res.data.status == "ok") {
                        toaster.success("Your message has been sent! Thank you!");
                        $scope.comment_form.comment = "";
                    }
                }, function(err) {
                    console.log("error");
                    console.dir(err);
                    //if(err.statusText) toaster.error(err.statusText);
                    if(err.data) toaster.error(err.data);
                    else toaster.error("Sorry, something went wrong while submitting your comment. Please email sca-group@iu.edu. code:"+err.status);
                });
        } catch(e) {
            console.dir(e);
            toaster.error("Something went wrong while trying to send your comment. Please email sca-group@iu.edu");
        }
    }

    // if($scope.user) {
    //     $scope.serieses = {}; //make it easier to lookup series that needs to be updated
    //
    //     //list of all event binds that user has requested so far
    //     $scope.event_binds = [];
    //
    //     //start event streaming
    //     $scope.event = new ReconnectingWebSocket("wss:"+window.location.hostname+appconf.event_api+"/subscribe?jwt="+jwt);
    //     $scope.event.onopen = function(e) {
    //         console.log("eventws connection opened - binding:"+$scope.event_binds.length);
    //         $scope.event_binds.forEach(function(bind) {
    //             $scope.event.send(JSON.stringify({bind: bind}));
    //         });
    //     }
    //     $scope.event.onmessage = function(evt) {
    //         var data = JSON.parse(evt.data);
    //         //parse routing key
    //         var key = data.dinfo.routingKey;
    //         var keytokens = key.split(".");
    //         var research_id = keytokens[0];
    //         var exam_id = keytokens[1];
    //         var series_id = keytokens[2];
    //
    //         //update the series
    //         var series = $scope.serieses[series_id];
    //         if(!series) return; //RECENT UI doesn't load all series
    //         $scope.$apply(function() {
    //             series.qc = null; //could be missing
    //             for(var key in data.msg) series[key] = data.msg[key]; //update the rest
    //             //console.log("update for "+key);
    //             //console.log(JSON.stringify(series));
    //             $scope.count($scope.org);  //TODO recount the entire thing is too expensive? maybe use $timeout?
    //         });
    //
    //         /*
    //         //assume it's series.. look for research that this information belongs to
    //         for(var iibisid in $scope.org) {
    //             for(var modality_id in $scope.org[iibisid]) {
    //                 var modality = $scope.org[iibisid][modality_id];
    //                 if(modality._detail._id == research_id) {
    //                     //found modality that update belongs to.. now find the series.
    //                     for(var
    //                     //console.log("belongs to this");
    //                     //console.dir(modality);
    //                 }
    //             }
    //         }
    //         */
    //     }
    //     /*
    //     $scope.event.onmessage = function(json) {
    //         var e = JSON.parse(json.data);
    //         console.dir(e);
    //         if(e.msg) {
    //             var task = e.msg;
    //             $scope.$broadcast("task_updated", task);
    //         } else {
    //             console.log("unknown message from eventws");
    //             console.dir(e);
    //         }
    //     }
    //     */
    //     /*
    //     $scope.event.onclose = function(e) {
    //         console.log("eventws connection closed - should auto reconnect");
    //     }
    //     */
    //
    //     $scope.event_bind = function(bind) {
    //         if(!$scope.event) return; //not initialized
    //         console.log("binding to "+bind.ex+"/"+bind.key);
    //         $scope.event_binds.push(bind); //to rebind on reconnect
    //         //if not connected yet, onopen should take care of it
    //         if($scope.event.readyState == 1) {
    //             $scope.event.send(JSON.stringify({bind: bind}));
    //         }
    //     }
    // }

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
