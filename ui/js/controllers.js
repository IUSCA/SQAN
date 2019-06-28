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


app.controller('SigninController', ['$scope', 'appconf', '$location', 'toaster', '$http',
function($scope, appconf, $location, toaster, $http) {

    $scope.begin_iucas = function() {
        window.location = appconf.iucas_url+'?cassvc=IU&casurl='+window.location;
    };

    $scope.validate = function(casticket) {
        $http.get(appconf.api +'/verify?casticket='+casticket)
            .then(function(res) {
                // console.log(res);
                localStorage.setItem(appconf.jwt_id, res.data.jwt);
                localStorage.setItem('uid', res.data.uid);
                localStorage.setItem('role', res.data.role);
                var redirect = sessionStorage.getItem('auth_redirect');

                if(res.data.role == 'technologist') {
                    redirect = '#/exams/1';
                }
                if(res.data.role == 'researcher') {
                    redirect = '#/summary';
                }
                console.log(redirect);
                sessionStorage.removeItem('auth_redirect');
                console.log("done.. redirecting "+redirect);
                window.location = appconf.base_url + redirect;
            }, function(res) {
                console.dir(res);
                if(res.data && res.data.path) {
                    window.location = res.data.path;
                } else {
                    window.location = appconf.base_url + appconf.default_redirect_url;
                }
            });
    }

    console.log("iucascb::app.run ref:"+document.referrer);
    var casticket = getParameterByName('casticket');
    if(casticket === undefined || casticket === ''){
        $scope.begin_iucas();
    } else {
        $scope.validate(casticket);
    }

}]);



function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}
