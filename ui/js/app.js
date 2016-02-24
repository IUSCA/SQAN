'use strict';

var app = angular.module('app', [
    'app.config',
    'ngRoute',
    'ngCookies',
    'ngAnimate',
    'toaster',
    'angular-loading-bar',
    'angular-jwt',
    'ui.bootstrap',
    'ui.bootstrap.tabs',
    'ui.select',
    'sca-shared',
    'ui.gravatar',
]);

//show loading bar at the page top
app.config(['cfpLoadingBarProvider', function(cfpLoadingBarProvider) {
    cfpLoadingBarProvider.includeSpinner = false;
}]);

//can't quite do the slidedown animation through pure angular/css.. borrowing slideDown from jQuery..
app.animation('.slide-down', ['$animateCss', function($animateCss) {
    return {
        enter: function(elem, done) {
            $(elem).hide().slideDown("normal", done);
        },
        leave: function(elem, done) {
            $(elem).slideUp("normal", done);
        }
    };
}]);

//configure route
app.config(['$routeProvider', 'appconf', function($routeProvider, appconf) {
    $routeProvider.
    when('/about', {
        templateUrl: 't/about.html',
        controller: 'AboutController'
    })
    .when('/study/:seriesid', {
        templateUrl: 't/series.html',
        controller: 'SeriesController',
        requiresLogin: true
    })
    .when('/research', {
        templateUrl: 't/research.html',
        controller: 'ResearchController',
        requiresLogin: true
    })
    .when('/research/:researchid', {
        templateUrl: 't/research.html',
        controller: 'ResearchController',
        requiresLogin: true
    })
    .when('/template/:templateid', {
        templateUrl: 't/template.html',
        controller: 'TemplateController',
        requiresLogin: true
    })
    .when('/recent', {
        templateUrl: 't/recent.html',
        controller: 'RecentController',
        requiresLogin: true,
    })
    .when('/qc', {
        redirectTo: '/qc/1',
    })
    .when('/qc/:level', {
        templateUrl: 't/qc.html',
        controller: 'QCController',
        requiresLogin: true
    })
    .when('/admin', {
        templateUrl: 't/admin.html',
        controller: 'AdminController',
        requiresLogin: true,
    })
    .otherwise({
        redirectTo: '/about'
    });
}]).run(['$rootScope', '$location', 'toaster', 'jwtHelper', 'appconf', 'scaMessage',
function($rootScope, $location, toaster, jwtHelper, appconf, scaMessage) {
    $rootScope.$on("$routeChangeStart", function(event, next, current) {
        //redirect to /login if user hasn't authenticated yet
        if(next.requiresLogin) {
            var jwt = localStorage.getItem(appconf.jwt_id);
            if(jwt == null || jwtHelper.isTokenExpired(jwt)) {
                sessionStorage.setItem('auth_redirect', document.location.toString());
                scaMessage.info("Please signin first!");
                document.location = appconf.auth_url;
                event.preventDefault();
            }
        }
    });
}]);

//configure httpProvider to send jwt unless skipAuthorization is set in config (not tested yet..)
app.config(['appconf', '$httpProvider', 'jwtInterceptorProvider', 
function(appconf, $httpProvider, jwtInterceptorProvider) {
    jwtInterceptorProvider.tokenGetter = function(jwtHelper, config, $http, toaster) {
        //don't send jwt for template requests
        //(I don't think angular will ever load css/js - browsers do)
        if (config.url.substr(config.url.length - 5) == '.html') { return null; }
        return localStorage.getItem(appconf.jwt_id);
    }
    $httpProvider.interceptors.push('jwtInterceptor');
}]);

//just a service to load all users from auth service
app.factory('serverconf', ['appconf', '$http', 'jwtHelper', function(appconf, $http, jwtHelper) {
    return $http.get(appconf.api+'/config')
    .then(function(res) {
        return res.data;
    });
}]);

app.directive('studynote', function() {
    return {
        scope: { study: '=', },
        templateUrl: 't/studynote.html',
        link: function($scope, elem, attrs) {
            update();
            $scope.$watch('study', update, true);
            function update() {
                if(!$scope.study) return; //study not loaded yet?
                $scope.studystate = "na";
                if($scope.study.qc) {
                    if($scope.study.qc.notemps > 0) $scope.studystate = "notemp";
                    else if($scope.study.qc.errors.length > 0) $scope.studystate = "error";
                    else if($scope.study.qc.warnings.length > 0) $scope.studystate = "warning";
                    else $scope.studystate = "ok";
                }
                if($scope.study.qc2_state)  {
                    switch($scope.study.qc2_state) {
                    case "accept": 
                        //$scope.label = "QC2";
                        $scope.qc2 = "success"; break;
                    case "condaccept": 
                        //$scope.label = "QC2";
                        $scope.qc2 = "warning"; break;
                    case "reject":
                        //$scope.label = "QC2";
                        $scope.qc2 = "danger"; break;
                    }
                }
                if($scope.study.qc1_state) {
                    switch($scope.study.qc1_state) {
                    case "accept":
                        $scope.qc1 = "warning"; break;
                    case "autopass":
                        $scope.qc1 = "success"; break;
                    case "reject":
                        $scope.qc1 = "danger"; break;
                    }
                }
            }
        }
    } 
});

app.directive('qcerror', function() {
    return {
        scope: { error: '=', },
        templateUrl: 't/qcerror.html',
    } 
});

app.directive('qcwarning', function() {
    return {
        scope: { warning: '=', },
        templateUrl: 't/qcwarning.html',
    } 
});

app.factory('menu', ['appconf', '$http', 'jwtHelper', '$sce', 'scaMessage', 'scaMenu', 'toaster',
function(appconf, $http, jwtHelper, $sce, scaMessage, scaMenu, toaster) {
    var jwt = localStorage.getItem(appconf.jwt_id);
    var menu = {
        header: {
            //label: appconf.title,
            //icon: $sce.trustAsHtml("<img src=\""+appconf.icon_url+"\">"),
            //url: "#/",
        },
        top: scaMenu,
        user: null, //to-be-loaded
        //_profile: null, //to-be-loaded
    };

    var jwt = localStorage.getItem(appconf.jwt_id);
    if(jwt) {
        var expdate = jwtHelper.getTokenExpirationDate(jwt);
        var ttl = expdate - Date.now();
        if(ttl < 0) {
            toaster.error("Your login session has expired. Please re-sign in");
            localStorage.removeItem(appconf.jwt_id);
        } else {
            menu.user = jwtHelper.decodeToken(jwt);
            if(ttl < 3600*1000) {
                //jwt expring in less than an hour! refresh!
                console.log("jwt expiring in an hour.. refreshing first");
                $http({
                    url: appconf.auth_api+'/refresh',
                    //skipAuthorization: true,  //prevent infinite recursion
                    //headers: {'Authorization': 'Bearer '+jwt},
                    method: 'POST'
                }).then(function(response) {
                    var jwt = response.data.jwt;
                    localStorage.setItem(appconf.jwt_id, jwt);
                    menu.user = jwtHelper.decodeToken(jwt);
                });
            }
        }
    }
    /*
    if(menu.user) {
        $http.get(appconf.profile_api+'/public/'+menu.user.sub).then(function(res) {
            menu._profile = res.data;
            if(res.data) {
                //logged in, but does user has email?
                if(res.data.email) {
                    return menu; //TODO - return return to what?
                } else {
                    //force user to update profile
                    //TODO - do I really need to?
                    scaMessage.info("Please update your profile before using application.");
                    sessionStorage.setItem('profile_settings_redirect', window.location.toString());
                    document.location = appconf.profile_url;
                }
            } else {
                //not logged in.
                return menu; //TODO return to what?
            }
        });
    }
    */
    return menu;
}]);

app.factory('users', ['appconf', '$http', 'jwtHelper', 'toaster', function(appconf, $http, jwtHelper, toaster) {
    return $http.get(appconf.auth_api+'/profiles')
    .then(function(res) {
        var users = {};
        res.data.forEach(function(user) {
            users[user.id] = user;
        });
        return users;
    }, function(res) {
        if(res.data && res.data.message) toaster.error(res.data.message);
        else toaster.error(res.statusText);
    });
}]);

app.factory('groups', ['appconf', '$http', 'jwtHelper', 'toaster', function(appconf, $http, jwtHelper, toaster) {
    return $http.get(appconf.auth_api+'/groups')
    .then(function(res) {
        return res.data;
    }, function(res) {
        if(res.data && res.data.message) toaster.error(res.data.message);
        else toaster.error(res.statusText);
    });
}]);

//http://plnkr.co/edit/juqoNOt1z1Gb349XabQ2?p=preview
/**
 * AngularJS default filter with the following expression:
 * "person in people | filter: {name: $select.search, age: $select.search}"
 * performs a AND between 'name: $select.search' and 'age: $select.search'.
 * We want to perform a OR.
 */
app.filter('propsFilter', function() {
    return function(items, props) {
        var out = [];
        if (angular.isArray(items)) {
            items.forEach(function(item) {
                var itemMatches = false;
                var keys = Object.keys(props);
                for (var i = 0; i < keys.length; i++) {
                    var prop = keys[i];
                    var text = props[prop].toLowerCase();
                    if (item[prop].toString().toLowerCase().indexOf(text) !== -1) {
                        itemMatches = true;
                        break;
                    }
                }

                if (itemMatches) {
                    out.push(item);
                }
            });
        } else {
            // Let the output be the input untouched
            out = items;
        }
        return out;
    };
});

/*
app.filter('toArray', function() { return function(obj) {
    if (!(obj instanceof Object)) return obj;
    return _.map(obj, function(val, key) {
        return Object.defineProperty(val, '$key', {__proto__: null, value: key});
    });
}});
*/

//http://stackoverflow.com/questions/14852802/detect-unsaved-changes-and-alert-user-using-angularjs
app.directive('confirmOnExit', function() {
    return {
        //scope: { form: '=', },
        link: function($scope, elem, attrs) {
            window.onbeforeunload = function(){
                if ($scope.form.$dirty) {
                    return "You have unsaved changes.";
                }
            }
            $scope.$on('$locationChangeStart', function(event, next, current) {
                if ($scope.form.$dirty) {
                    if(!confirm("Do you want to abondon unsaved changes?")) {
                        event.preventDefault();
                    }
                }
            });
        }
    };
});


