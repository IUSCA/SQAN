app.directive('studynote', function() {
    return {
        scope: { study: '<', },
        templateUrl: 't/studynote.html',
        link: function($scope, elem, attrs) {
            update();
            $scope.$watch('study', update, true);
            function update() {
                if(!$scope.study) return; //study not loaded yet?
                $scope.studystate = "na";
                if($scope.study.qc) {
                    if($scope.study.qc.errors && $scope.study.qc.errors.length > 0) $scope.studystate = "error";
                    else if($scope.study.qc.notemps > 0) $scope.studystate = "notemp";
                    else if($scope.study.qc.warnings && $scope.study.qc.warnings.length > 0) $scope.studystate = "warning";
                    else $scope.studystate = "ok";
                } else if ($scope.study.qc1_state == "no template") $scope.studystate = "notemp";

                $scope.qc1 = null;
                if($scope.study.qc1_state) {
                    switch($scope.study.qc1_state) {
                    case "accept":
                        $scope.qc1 = "warning"; break;
                    // case "autopass":
                    //     $scope.qc1 = "success"; break;
                    case "reject":
                        $scope.qc1 = "danger"; break;
                    // case "no template":
                    //     $scope.qc1 = "info"; break;
                    }
                }
                $scope.qc2 = null;
                if($scope.study.qc2_state)  {
                    switch($scope.study.qc2_state) {
                    case "accept":
                        //$scope.label = "QC2";
                        $scope.qc2 = "success"; break;
                    case "condaccept":
                        //$scope.label = "QC2";
                        $scope.qc2 = "warning"; break;
                    case "reject":
                        //$scope.label = "QC2";
                        $scope.qc2 = "danger"; break;
                    }
                }
            }
        }
    }
});

app.directive('qcerror', function() {
    return {
        scope: { error: '=', },
        templateUrl: 't/qcerror.html',
    }
});

app.directive('qcwarning', function() {
    return {
        scope: { warning: '=', },
        templateUrl: 't/qcwarning.html',
    }
});

app.directive('errorpanel', function() {
    return {
        scope: { error: '=', type: '=', notemps: '='},
        templateUrl: 't/components/errorpanel.html',
    }
});


app.component('exams', {
    templateUrl: 't/components/exams.html',
    bindings: {
        exam: "<",
        templates: '<',
        qc: '<',
        mode: '<', //view mode ('wide' / 'tall')
        deprecated: '=',
        templateLookup: '<'
    },
    controller: function(appconf, $scope, $window, $http, $uibModal, toaster, $interval, users) {
        var $ctrl = this;



        users.then(function(_users) { $ctrl.users = _users; });        

        this.openstudy = function(id) {
            $window.open("series/"+id, "study:"+id);
        }

        this.opentemplate = function(id) {
            $window.open("template/"+id);
        }

        this.openmodal = function () {
            $uibModal.open({
                templateUrl: 't/components/overridemodal.html',
                size: 'lg',
                controller: function ($scope, $uibModalInstance) {
                    $scope.templates = $ctrl.templates;
                    var $mctrl = this;
                    $scope.exam = $ctrl.exam;
                    this.overridetemplate = '';

                    $scope.select_template = function(item) {
                        $mctrl.overridetemplate = item;
                    }

                    $scope.ok = function () {
                        $uibModalInstance.close($mctrl.overridetemplate);
                    };

                    $scope.cancel = function () {
                        $uibModalInstance.dismiss('cancel');
                    };
                }
            }).result.then(function(result){
                console.log(result);
                $http.post(appconf.api+'/exam/template/'+$ctrl.exam._id, {template_id: result._id})
                    .then(function(res) {
                        toaster.success(res.data.message);
                    }, function(res) {
                        if(res.data && res.data.message) toaster.error(res.data.message);
                        else toaster.error(res.statusText);
                    });
            }, function(result){
                console.log('cancel or escaped');
                console.log(result);
            });
        }


        this.opencomment = function () {
            $uibModal.open({
                templateUrl: 't/components/addcomment.html',
                size: 'lg',
                controller: function ($scope, $uibModalInstance) {
                    $scope.exam = $ctrl.exam;
                    console.log($scope.exam);

                    $scope.comment = "";

                    $scope.delete = function (comment) {
                        console.log(comment);
                        $scope.comment = comment;
                        $uibModalInstance.close(comment);
                    };

                    $scope.cancel = function () {
                        $uibModalInstance.dismiss('cancel2');
                    };
                }
            }).result.then(function(result){

                console.log($ctrl.exam._id);

                console.log("deleting exam "+ $ctrl.exam._id)
                $http.post(appconf.api+'/exam/delete/'+$ctrl.exam._id, {comment: result})
                .then(function(res) {
                    toaster.success(res.data.message);
                    $ctrl.exam = res.data.exam;
                    $scope.$emit("ExamDeletion", $ctrl.exam);
                }, function(res) {
                    if(res.data && res.data.message) toaster.error(res.data.message);
                    else toaster.error(res.statusText);
                });

            }, function(result){
                console.log('cancel or escaped');
                console.log(result);
            });
        }


        this.opendeleted = function (comment) {
            $uibModal.open({
                templateUrl: 't/components/viewdeleted.html',
                size: 'lg',
                controller: function ($scope, $uibModalInstance) {
                    $scope.exam = $ctrl.exam;
                    console.log($scope.exam);

                    $scope.comment = comment;
                    console.log($scope.comment)

                    console.log($ctrl.users)
                    $scope.user = $ctrl.users[comment.user_id];

                    $scope.close = function () {
                        $uibModalInstance.dismiss('close');
                    };
                }
            }).result.then(function(){

                console.log('nothing to do');

            }, function(result){
                console.log(result);
            });
        }

        this.opencontactpi = function () {
            $uibModal.open({
                templateUrl: 't/components/contactpi.html',
                size: 'lg',
                controller: function ($scope, $uibModalInstance) {
                    $scope.exam = $ctrl.exam;
                    console.log($scope.exam);
                    
                    $scope.users = $ctrl.users;
                    console.log( $scope.users) 

                    $scope.comment_form = {
                        subject:' ',
                        name: $scope.users !== undefined ? $scope.users.profile.fullname : '',
                        email: $scope.users !== undefined ? $scope.users.profile.email : '',
                        message: ''
                    };

                    $scope.comment = "";

                    $scope.delete = function (comment) {
                        console.log(comment);
                        $scope.comment = comment;
                        $uibModalInstance.close(comment);
                    };

                    $scope.cancel = function () {
                        $uibModalInstance.dismiss('cancel2');
                    };
                }
            }).result.then(function(result){

                console.log($ctrl.exam._id);

                console.log("deleting exam "+ $ctrl.exam._id)
                $http.post(appconf.api+'/exam/delete/'+$ctrl.exam._id, {comment: result})
                .then(function(res) {
                    toaster.success(res.data.message);
                    $ctrl.exam = res.data.exam;
                    $scope.$emit("ExamDeletion", $ctrl.exam);
                }, function(res) {
                    if(res.data && res.data.message) toaster.error(res.data.message);
                    else toaster.error(res.statusText);
                });

            }, function(result){
                console.log('cancel or escaped');
                console.log(result);
            });
        }


        this.qcalert = function(exam,alert_tyep) {
            date = new Date(exam.StudyTimestamp);
            var StudyTimestamp = (date.getMonth()+1)+'/' + date.getDate() + '/'+date.getFullYear();
            //var StudyTimestamp = date.getFullYear()+'-' + (date.getMonth()+1) + '-'+date.getDate();
            var alert = `Please confirm that you want to ${alert_tyep} series for 
            Subject: ${exam.subject}
            Study Timestamp: ${StudyTimestamp}`
            var r = confirm(alert);

            if (r == true) {
                if (alert_tyep=="ReQC all") {
                    console.log("ReQc-ing all!");
                    this.reqc_all(exam._id);
                }
                else if (alert_tyep=="ReQC failed"){
                    console.log("ReQc-ing failures!");
                    this.reqc_failed(exam._id);
                }
                else if (alert_tyep=="delete all"){
                    console.log("Deleting Exam "+exam.subject);
                    this.delete_exam(exam._id);
                }
            } else {
              console.log("action canceled")
            }
        }

        this.delete_exam = function(exam_id, comment) {
            console.log("deleting exam "+exam_id)
            $http.post(appconf.api+'/exam/delete/'+exam_id, {comment: comment})
            .then(function(res) {
                toaster.success(res.data.message);
            }, function(res) {
                if(res.data && res.data.message) toaster.error(res.data.message);
                else toaster.error(res.statusText);
            });
        }

        this.reqc_failed = function(exam_id) {
            console.log("reQC errored series")
            $http.post(appconf.api+'/series/reqcerroredseries/'+exam_id)
            .then(function(res) {
                toaster.success(res.data.message);
            }, function(res) {
                if(res.data && res.data.message) toaster.error(res.data.message);
                else toaster.error(res.statusText);
            });
        }

        this.reqc_all = function(exam_id) {
            console.log("reQC all series")
            $http.post(appconf.api+'/series/reqcallseries/'+exam_id)
            .then(function(res) {
                toaster.success(res.data.message);
            }, function(res) {
                if(res.data && res.data.message) toaster.error(res.data.message);
                else toaster.error(res.statusText);
            });
        }

    },
});


app.component('templates', {
    templateUrl: 't/components/templates.html',
    controller: function($window) {
        var $ctrl = this;
        console.log("init templates");
        this.opentemplate = function(id) {
            $window.open("template/"+id, "template:"+id);
        }
        this.keys = function(obj){
            return obj? Object.keys(obj) : [];
        }
    },
    bindings: {
        templates: '=', //[time] = template
        times: '<', //list of timestamps to show
    },
});

app.component('viewmodeToggler', {
    templateUrl: 't/components/viewmodetoggler.html',
    controller: function($window) {
        var $ctrl = this;
        this.toggleView = function() {
            console.log("toggling!")
            if($ctrl.deprecated === null) {
                $ctrl.deprecated = true;
            } else if($ctrl.deprecated === true) {
                $ctrl.deprecated = false;
            } else if($ctrl.deprecated === false) {
                $ctrl.deprecated = null;
            }
        }
    },
    bindings: {
        mode: '=', //view mode ('wide' / 'tall')
        deprecated: '='
    }
});


//http://stackoverflow.com/questions/14852802/detect-unsaved-changes-and-alert-user-using-angularjs
app.directive('confirmOnExit', function() {
    return {
        //scope: { form: '=', },
        link: function($scope, elem, attrs) {

            window.onbeforeunload = function(){

                if ($scope[attrs["name"]].$dirty) {
                    return "You have unsaved changes.";
                }
            }
            $scope.$on('$locationChangeStart', function(event, next, current) {
                console.log(elem);
                if ($scope[attrs["name"]].$dirty) {
                    if(!confirm("Do you want to abandon unsaved changes?")) {
                        event.preventDefault();
                    }
                }
            });
        }
    };
});

