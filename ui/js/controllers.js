'use strict';

/*
 * Right now, we are going to have a single module for our app which contains
 * all controllers. In the future, we should refactor into multiple modules. When I do, don't forget
 * to add it to app.js's module list
 * */

app.controller('StudyController', ['$scope', 'appconf', 'toaster', '$http', 'jwtHelper', '$cookies', '$location', 'menu', 'serverconf',
function($scope, appconf, toaster, $http, jwtHelper, $cookies, $location, menu, serverconf) {
    menu.then(function(_menu) { $scope.menu = _menu; });
    serverconf.then(function(_serverconf) { $scope.serverconf = _serverconf; });
    //var jwt = localStorage.getItem(appconf.jwt_id);
    //var user = jwtHelper.decodeToken(jwt);
    return $http.get(appconf.api+'/study/recent')
    .then(function(res) {
        $scope.studies = res.data.studies;
        $scope.serieses = res.data.serieses;
        $scope.researches = res.data.researches;
    });
}]);


