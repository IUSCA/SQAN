app.controller('IngestController',
    function($scope, appconf, toaster, groups, $http, $location, serverconf, $routeParams) {
        $scope.$parent.active_menu = "ingest";
        $scope.appconf = appconf;
        $scope.ingest = {
            studyname: "",
            path: "",
        };


        $scope.verifyIngestion = function(){
            toaster.success("Submitting Ingestion...");
            $http.post(appconf.api+'/ingest', $scope.ingest)
                .then(function(res) {
                    console.log(res.data);
                    toaster.success("Path found and sent to incoming service");
                }, $scope.toast_error);
        };
    });
