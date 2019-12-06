app.controller('AboutController',
function($scope, appconf, toaster, $http, serverconf) {
    $scope.appconf = appconf;
    $scope.$parent.active_menu = "about";
    //scaMessage.show(toaster);
    serverconf.then(function(_serverconf) { $scope.serverconf = _serverconf; });

    $scope.goBack = function() {
        window.history.back();
    }
});



app.controller('DataflowController',
function($scope, appconf, toaster, $http, serverconf) {
    $scope.datasends = [];

    $http.get(appconf.api+'/dataflow')
        .then(function(res) {
            angular.forEach(res.data, function(ds, key) {
                ds['received'] = {};
                ds['received_count'] = 0;
                ds['expected_count'] = 0;
                ds.series.forEach(function(s) {
                    ds['expected_count'] += s.image_count;
                })
                $http.get(appconf.api+'/dataflow/imgcount?iibis='+ds.iibis+'&subject='+ds.subject+'&StudyTimestamp='+ds.date)
                    .then(function(_res) {
                        console.log(_res.data);
                        ds.received = _res.data;
                        angular.forEach(_res.data, function(s, key) {
                            ds.received_count += s
                        });
                        $scope.datasends.push(ds);
                    }, $scope.toast_error)
            })
        }, $scope.toast_error);
});


app.controller('SigninController', ['$scope', 'appconf', '$location', 'toaster', '$http',
function($scope, appconf, $location, toaster, $http) {

    $scope.mode = appconf.mode;

    $scope.begin_iucas = function() {
        window.location = appconf.iucas_url+'?cassvc=IU&casurl='+window.location;
    };

    $scope.open_about = function() {
        window.location = appconf.base_url + 'about';
    }


    $scope.form = {
        username: '',
        password: ''
    };

    //guest login only available in demo mode
    $scope.guest_login = function() {
        if($scope.mode !== 'demo') return;
        $http.get(appconf.api +'/guestLogin')
            .then(function(res) {
                toaster.success("Logging you in as Guest");
                localStorage.setItem(appconf.jwt_id, res.data.jwt);
                $scope.$parent.isguest = true;
                $scope.$parent.showLogin = false;
                localStorage.setItem('uid', res.data.uid);
                localStorage.setItem('role', res.data.role);
                window.location = appconf.base_url + appconf.default_redirect_url;
            }, function(err) {
                toaster.error("Guest Login failed");
            })
    };

    $scope.username_login = function() {
        if($scope.mode !== 'harvard') return;
        $http.post(appconf.api +'/userLogin', $scope.form)
            .then(function(res) {
                toaster.success(`Logging you in as user ${$scope.form.username}`);
                localStorage.setItem(appconf.jwt_id, res.data.jwt);
                $scope.$parent.isguest = true;
                $scope.$parent.showLogin = false;
                localStorage.setItem('uid', res.data.uid);
                localStorage.setItem('role', res.data.role);
                window.location = appconf.base_url + appconf.default_redirect_url;
            }, function(err) {
                toaster.error("User Login failed");
            })
    };

    $scope.validate = function(casticket) {
        $http.get(appconf.api +'/verify?casticket='+casticket)
            .then(function(res) {
                // console.log(res);
                $location.search({});
                localStorage.setItem(appconf.jwt_id, res.data.jwt);
                localStorage.setItem('uid', res.data.uid);
                localStorage.setItem('role', res.data.role);
                var redirect = 'exams/all';

                if(res.data.role == 'technologist') {
                    redirect = 'exams/1';
                }
                if(res.data.role == 'researcher') {
                    redirect = 'summary';
                }
                console.log(redirect);
                $scope.$parent.showLogin = false;
                sessionStorage.removeItem('auth_redirect');
                console.log("done.. redirecting "+redirect);
                console.log(window.location);
                $location.path(redirect);
            }, function(res) {
                console.dir(res);
                if(res.data && res.data.path) {
                    window.location = res.data.path;
                } else {
                    window.location = appconf.base_url + appconf.default_redirect_url;
                }
            });
    }

    var casticket = getParameterByName('casticket');

    if(casticket !== undefined && casticket !== ''){
        $scope.validate(casticket);
    } else {
        if($scope.mode !== 'demo' && $scope.mode !== 'harvard'){
            $scope.begin_iucas();
        }
    }

}]);


app.controller('SignoutController',
    function($scope, appconf) {
        localStorage.removeItem(appconf.jwt_id);
        localStorage.removeItem('uid');
        localStorage.removeItem('role');

        if($scope.$parent.isguest) {
            window.location = appconf.base_url + '#/signin';
        } else {
            window.location = appconf.iucas_logout;
        }
    });



function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}
