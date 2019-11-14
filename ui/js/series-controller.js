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

    $scope.comment_form = {
        subject:' ',
        name: $scope.user !== undefined ? $scope.user.profile.fullname : '',
        email: $scope.user !== undefined ? $scope.user.profile.email : '',
        message: ''
    };

    const mergeByInstanceNumber = (a1, a2) =>
        a1.map(itm => ({
            image: a2.find((item) => (item.headers.InstanceNumber === itm.InstanceNumber) && item),
            ...itm
        }));


    function load_series() {
        if(!$routeParams.seriesid) return; //probably the route changed since last time
        $http.get(appconf.api+'/series/id/'+$routeParams.seriesid)

        .then(function(res) {
            $scope.data = res.data;
            $scope.data.template_images = [];
            console.log($scope.data)


            if($scope.data.images) {
                $scope.data.images.forEach(computeColor);
            }
            //find template object selected / used by QC
            res.data.templates.forEach(function(template) {
                if(template._id == res.data.series.qc.template_id) {
                    $scope.data.template = template;
                    $http.get(appconf.api+'/template/head/'+template._id)
                        .then(function(tres) {
                            console.log(tres.data.templates);
                            $scope.data.template_images = mergeByInstanceNumber(tres.data.templates, $scope.data.images);
                        }, $scope.toast_error)
                }
            });
            // get date received by SCA
            $scope.data.date_received = res.data.series.createdAt;
            res.data.series.events.forEach(function(e,index){

                        /*
                        "Exam-level ReQC all",
                        "Received",
                        "Research-level ReQC failures",
                        "Series Overwritten",
                        "Template override",
                        "Research-level ReQC all",
                        "Updated QC1 state to accept",
                        "Series-level ReQC",
                        "Updated QC1 state to reject"
                        */

                        if(e.title == 'Template override') $scope.data.series.events[index].icon = "fa fa-fw fa-file";
                        else if(e.title.includes('ReQC')) $scope.data.series.events[index].icon = "fa fa-fw fa-refresh";
                        else if(e.title == "Series Overwritten") $scope.data.series.events[index].icon = "fa fa-exchange";
                        else if(e.title.includes('Updated QC1')) {
                            $scope.data.series.events[index].icon = "fa fa-exclamation-circle";                                     $scope.data.series.events[index].qc1_update = e.title.includes('accept')? "accept" : "reject";
                            if (e.detail.qc1_state.includes('fail')) $scope.data.series.events[index].qc1_prev = 'reject';
                            else if (e.detail.qc1_state.includes('autopass')) $scope.data.series.events[index].qc1_prev = 'accept';
                            else if (e.detail.qc1_state.includes('no template')) $scope.data.series.events[index].qc1_prev = 'no template';
                            $scope.data.series.events[index].title = "QC1 state manually updated:";
                            console.log(e.title);
                            console.log($scope.data.series.events[index].qc1_update)
                        }


                if (e.user_id !== undefined && $scope.users[e.user_id]) {
                    $scope.data.series.events[index].username = $scope.users[e.user_id].fullname;
                } else $scope.data.series.events[index].username = "SQAN";
            })

            $scope.comment_form.subject = 'Query on SUBJECT: '+$scope.data.series.exam_id.subject

            $scope.comment_form.message = 'IIBISID: '+ $scope.data.series.exam_id.research_id.IIBISID +'\n' +
            'SUBJECT: '+$scope.data.series.exam_id.subject+'\n' +
            'STUDY TIMESTAMP: '+$scope.data.series.exam_id.StudyTimestamp+'\n' +
            'SERIES DESCRIPTION: '+$scope.data.series.series_desc

            if ($scope.data.series.qc1_state != "no template") {
                $scope.comment_form.message = $scope.comment_form.message + '\n' +
                'TEMPLATE USED: '+ $scope.data.template.exam_id.StudyTimestamp
            }

            $scope.comment_form.message = $scope.comment_form.message + '\n' +
            'QC-STATUS: '+ $scope.data.series.qc1_state+'\n'

            $scope.comment_form.message = $scope.comment_form.message+ `
            Dear PI,
            
            I have the following query about this dataset:
            
            
            
            
            Kind regards,
            ${$scope.comment_form.name}
            `

            //reload if qc is not yet loaded
            if(res.data.series.qc1_state != "no template" && !res.data.series.qc) {
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
            if(image.qc != undefined && image.qc.errors !== undefined) {
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
            console.log()
            $http.get(appconf.api+'/image/'+image._id)
                .then(function(res) {
                    $scope.image_detail = res.data;
                    console.log(res.data);

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
                                if(error.type == 'not_set') $scope.image_headers[error.k] = undefined; //so that I can display *missing*
                            } else $scope.other_errors.push(error);
                        });
                        res.data.qc.warnings.forEach(function(warning) {
                            if(warning.type == 'image_tag_mismatch') {
                                warning.k.forEach(function(k) {
                                    $scope.image_notemplate[k.ik] = {};
                                });
                            } else if(warning.k) {
                                $scope.image_warnings[warning.k] = warning;
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


        $scope.QCalert = function() {
            var alert = `Please confirm that you want to ReQC this Series`;
            var r = confirm(alert);
            if (r == true) {
                console.log("ReQc-ing series " +$routeParams.seriesid);
                reqc();

            } else {
                console.log("ReQc canceled")
            }
        }


    reqc = function() {
        $scope.image_detail = null;
        $scope.active_image = null;
        $http.post(appconf.api+'/series/reqc/'+$routeParams.seriesid)
        .then(function(res) {
            console.log(res)
            load_series();
            toaster.success(res.data.message);
        }, $scope.toast_error);
    }


    $scope.contact_PI = function() {
        console.log($scope.comment_form);
        try {

            $http.post(appconf.api+'/contactpi', $scope.comment_form)
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
    

});
