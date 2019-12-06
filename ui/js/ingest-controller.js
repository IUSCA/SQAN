app.controller('IngestController',
    function($scope, appconf, toaster, groups, $http, $location, serverconf, $routeParams) {
        $scope.$parent.active_menu = "ingest";
        $scope.appconf = appconf;
        $scope.ingest = {
            studyname: "",
            path: "",
        };

        $scope.ingestions = [];


        $scope.verifyIngestion = function(){
            toaster.success("Submitting Ingestion...");
            $http.post(appconf.api+'/ingest', $scope.ingest)
                .then(function(res) {
                    console.log(res.data);
                    toaster.success("Path found and sent to incoming service");
                }, $scope.toast_error);
        };

        $scope.getIngestions = function(){
            $http.get(appconf.api+'/ingest/all')
                .then(function(res) {
                    console.log(res.data);
                    $scope.ingestions = res.data;
                }, $scope.toast_error);
        };

        $scope.getIngestions();
    });
