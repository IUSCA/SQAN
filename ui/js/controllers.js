app.controller('AboutController', 
function($scope, appconf, toaster, $http, serverconf) {
    $scope.appconf = appconf;
    $scope.$parent.active_menu = "about";
    //scaMessage.show(toaster);
    serverconf.then(function(_serverconf) { $scope.serverconf = _serverconf; });
});



app.controller('DataflowController',
function($scope, appconf, toaster, $http, serverconf) {
    $scope.datasends = [];

    $http.get(appconf.api+'/dataflow')
        .then(function(res) {
            $scope.datasends = res.data;
        }, $scope.toast_error);
});


