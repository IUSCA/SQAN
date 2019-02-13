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
