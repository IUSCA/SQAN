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

    $scope.show_all_headers = false;
    $scope.search = {
        key: ''
    };

    function load_series() {
        if(!$routeParams.seriesid) return; //probably the route changed since last time
        $http.get(appconf.api+'/series/id/'+$routeParams.seriesid)
        .then(function(res) {
            $scope.data = res.data;
            if($scope.data.images) {
                $scope.data.images.forEach(computeColor);
            }
            //find template object selected / used by QC
            res.data.templates.forEach(function(template) {
                if(template._id == res.data.series.qc.template_id) $scope.data.template = template;
            });
            // get date received by SCA
            res.data.series.events.forEach(function(e,index){
                if(e.title == "Received") {
                    console.log(e);
                    $scope.data.date_received = e.date;
                }
                if ($scope.users[e.user_id]) {
                    $scope.data.series.events[index].username = $scope.users[e.user_id].fullname;                    
                } else $scope.data.series.events[index].username = "RADY-SCA";               
            })
            //reload if qc is not yet loaded
            if(!res.data.series.qc) {
                $timeout(load_series, 1000);
            }
            console.log($scope.data);
        }, $scope.toast_error);
    }
    
    //TODO this needs some overhawling
    function computeColor(image) {
        var h = 0; 
        var s = "0%"; //saturation (default to gray)
        var l = "50%"; //light
        if(image.qc.errors !== undefined) {
            if(image.qc.errors.length > 0) {
                //error - red
                h = 0; 
                var _s = 50-image.qc.errors.length;
                if(_s < 0) _l = 0;
                s = _s+"%";
            } else if(image.qc.warnings.length > 0) {
                //warning - yello
                h = 60; 
                var _s = 50-image.qc.warnings.length;
                if(_s < 0) _l = 0;
                s = _s+"%";
            } else if(image.qc.notemp) {
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
        console.log(image);
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
            $scope.image_notemplate = {};
            $scope.other_errors = [];
            $scope.other_warnings = [];
            $scope.image_headers = {};

            if($scope.image_detail.primary_image !== null) {
                $scope.image_headers = $scope.image_detail.primary_image.headers;
                angular.forEach(res.data.headers, function(value, key) {
                    $scope.image_headers[key] = value;
                });
            } else {
                $scope.image_headers = res.data.headers;
            }

            if(res.data.qc) {
                res.data.qc.errors.forEach(function(error) {
                    if(error.type == 'image_tag_mismatch') {
                        error.k.forEach(function(k) {
                            $scope.image_notemplate[k.ik] = {};
                        });
                    } else if(error.k) {
                        $scope.image_errors[error.k] = error;
                        if(!$scope.image_headers[error.k]) $scope.image_headers[error.k] = undefined; //so that I can display *missing*
                    } else $scope.other_errors.push(error);
                });
                res.data.qc.warnings.forEach(function(warning) {
                    if(warning.k) {
                        $scope.image_warnings[warning.k] = warning;
                        if(!$scope.image_headers[warning.k]) $scope.image_headers[warning.k] = undefined; //so that I can display *missing*
                    }
                    else $scope.other_warnings.push(warning);
                });
            }

            var headers = angular.copy($scope.image_headers);
            $scope.image_headers = [];
            angular.forEach(headers, function(value, key) {
                if(key == 'AcquisitionNumber') $scope.image_detail.AcquisitionNumber = value;
                $scope.image_headers.push({'key': key, 'value': value});
            });

            // maintain user choice to show/hide all headers
            //if there is no error to show, show all headers by default
            // $scope.show_all_headers = true;
            // if($scope.image_detail.qc) {
            //     if($scope.image_detail.qc.errors != 0 || $scope.image_detail.qc.warnings != 0) {
            //         $scope.show_all_headers = false;
            //     }
            // }
        }, $scope.toast_error);
    }

    $scope.toggleheaders = function() {
        $scope.show_all_headers = !$scope.show_all_headers;
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
        console.log(item);

        var alert = `You are about to override the default template for this series; this action will result in ReQCing this series only with the selected template.`
                                
        var r = confirm(alert);
        if (r == true) {
            console.log("ReQc-ing series!");
            $scope.image_detail = null;
            $scope.active_image = null;
            $http.post(appconf.api+'/series/template/'+$routeParams.seriesid, {template_id: item._id})
            .then(function(res) {
                load_series();
                toaster.success(res.data.message);
            }, $scope.toast_error);
        } else {
            console.log("ReQc canceled")
        }
    }

    $scope.reqc = function() {  
        $scope.image_detail = null;
        $scope.active_image = null;
        $http.post(appconf.api+'/series/reqc/'+$routeParams.seriesid)
        .then(function(res) {
            console.log(res)
            load_series();
            toaster.success(res.data.message);
        }, $scope.toast_error);
    }
});