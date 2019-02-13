app.directive('studynote', function() {
    return {
        scope: { study: '=', },
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


app.component('exams', {
    templateUrl: 't/components/exams.html',
    bindings: {
        exam: "=",
        mode: '<', //view mode ('wide' / 'tall')
        deprecated: '=',
        templateLookup: '&'
    },
    controller: function(appconf, $window, $http, toaster, $interval) {
        var $ctrl = this;

        this.openstudy = function(id) {
            $window.open("#/series/"+id, "study:"+id);
        }
        this.opentemplate = function(id) {
            $window.open("#/template/"+id);
        }

        this.qcalert = function(exam,qc_type) {   
            date = new Date(exam.StudyTimestamp);
            var StudyTimestamp = (date.getMonth()+1)+'/' + date.getDate() + '/'+date.getFullYear();
            //var StudyTimestamp = date.getFullYear()+'-' + (date.getMonth()+1) + '-'+date.getDate();
            var alert = `Please confirm that you want to ReQC ${qc_type} series for 
            Subject: ${exam.subject}
            Study Timestamp: ${StudyTimestamp}`                                
            var r = confirm(alert);         

            if (r == true) {
                if (qc_type=="all") {
                    console.log("ReQc-ing all!");
                    this.reqc_all(exam._id);
                }
                else if (qc_type=="failed"){
                    console.log("ReQc-ing failures!");
                    this.reqc_failed(exam._id);
                }
            } else {
              console.log("ReQc canceled")
            }
        }

        this.reqc_all = function(exam_id) {
            console.log("reQC all series")
            $http.post(appconf.api+'/series/reqcallseries/'+exam_id)
            .then(function(res) {
                //$scope.$emit("exam_invalidated", {exam_id: exam_id});
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
                //$scope.$emit("exam_invalidated", {exam_id: exam_id});
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
            $window.open("#/template/"+id, "template:"+id);
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

