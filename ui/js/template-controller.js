app.controller('TemplateController',
function($scope, appconf, toaster, $http, $location, serverconf, $routeParams) {
    $scope.appconf = appconf;
    //scaMessage.show(toaster);
    serverconf.then(function(_serverconf) { $scope.serverconf = _serverconf; });

    $http.get(appconf.api+'/template/head/'+$routeParams.templateid)
    .then(function(res) {
        $scope.data = res.data;
        console.log($scope.data);
    }, $scope.toast_error);

    $scope.load_template = function(template) {
        $scope.active_template = template;
        $http.get(appconf.api+'/template/inst/'+template._id)
        .then(function(res) {
            $scope.image_detail = res.data;
            $scope.image_headers = {};            
            if($scope.image_detail.primary_image !== null) {
                $scope.image_headers = $scope.image_detail.primary_image.headers;
                angular.forEach(res.data.headers, function(value, key) {
                    $scope.image_headers[key] = value;
                });
                console.log($scope.image_headers)
            } else {
                $scope.image_headers = res.data.headers;
                console.log($scope.image_headers)
            }
        }, $scope.toast_error);
    }
});