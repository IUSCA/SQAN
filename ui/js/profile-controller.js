app.controller('ProfileController',
    function($scope, appconf, toaster, groups, $http, $location, serverconf, $routeParams) {
        $scope.$parent.active_menu = "profile";
        $scope.appconf = appconf;
        $scope.groups = {};
        $scope.self = {};
        $scope.self_groups = [];

        groups.then(function(_groups) {
            $scope.groups = _groups;
            //conver to easy to lookup object
            $scope.groups_o = [];
            $scope.groups.forEach(function(group) {
                $scope.groups_o[group._id] = group;
            });
        });

        $http.get(appconf.api+'/user/self')
            .then(function(res) {
                $scope.self = res.data.user;
                $scope.self_groups = res.data.groups;
                console.log(res.data);
            }, $scope.toast_error);
    });
