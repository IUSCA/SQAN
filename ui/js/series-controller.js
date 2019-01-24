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
            console.log($scope.data);
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
            console.log(res)
            load_series();
            toaster.success(res.data.message);
        }, $scope.toast_error);
    }
});