app.controller('ProfileController',
    function($scope, appconf, toaster, $http, $location, serverconf, $routeParams) {
        $scope.$parent.active_menu = "profile";
        $scope.appconf = appconf;
        $scope.self = {};

        $http.get(appconf.api+'/user/self')
            .then(function(res) {
                $scope.self = res.data;
                console.log($scope.data);
            }, $scope.toast_error);
    });
