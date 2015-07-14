'use strict';

var app = angular.module('app', [
    'app.config',
    'ngSanitize',
    'ngRoute',
    'ngCookies',
    'toaster',
    'angular-loading-bar',
    'angular-jwt',
    'ui.bootstrap'
]);

//show loading bar at the page top
app.config(['cfpLoadingBarProvider', function(cfpLoadingBarProvider) {
    cfpLoadingBarProvider.includeSpinner = false;
}]);

//configure route
app.config(['$routeProvider', 'appconf', function($routeProvider, appconf) {
    $routeProvider.
    when('/list', {
        templateUrl: 't/list.html',
        controller: 'ListController',
        requiresLogin: true
    })
    .when('/series/:date/:studyid/:seriesid', {
        templateUrl: 't/series.html',
        controller: 'SeriesController',
        requiresLogin: true
    })
    .when('/instance/:date/:studyid/:seriesid/:instid', {
        templateUrl: 't/instance.html',
        controller: 'InstanceController',
        requiresLogin: true
    })
    .otherwise({
        redirectTo: '/list'
    });
    
    //console.dir($routeProvider);
}]).run(['$rootScope', '$location', 'toaster', 'jwtHelper', 'appconf', function($rootScope, $location, toaster, jwtHelper, appconf) {
    $rootScope.$on("$routeChangeStart", function(event, next, current) {
        //redirect to /login if user hasn't authenticated yet
        if(next.requiresLogin) {
            var jwt = localStorage.getItem(appconf.jwt_id);
            if(jwt == null || jwtHelper.isTokenExpired(jwt)) {
                localStorage.setItem('post_auth_redirect', next.originalPath);
                document.location = appconf.url.loginurl+"?redirect="+document.location;
                event.preventDefault();
            }
        }
    });
}]);


app.config(['appconf', '$httpProvider', 'jwtInterceptorProvider', 
function(appconf, $httpProvider, jwtInterceptorProvider) {

    //configure httpProvider to send jwt unless skipAuthorization is set in config (not tested yet..)
    jwtInterceptorProvider.tokenGetter = function(jwtHelper, config, $http) {
        //don't send jwt for template requests
        if (config.url.substr(config.url.length - 5) == '.html') {
            return null;
        }
        var jwt = localStorage.getItem(appconf.jwt_id);
        var expdate = jwtHelper.getTokenExpirationDate(jwt);
        var ttl = expdate - Date.now();
        if(ttl < 0) {
            //expired already.. redirect to login form
            document.location = appconf.url.loginurl+"?redirect="+document.location;
        } else if(ttl < 3600*1000) {
            //jwt expring in less than an hour! refresh!
            //console.dir(config);
            //console.log("jwt expiring in an hour.. refreshing first");
            return $http({
                url: appconf.api.auth+'/refresh',
                skipAuthorization: true,  //prevent infinite recursion
                headers: {'Authorization': 'Bearer '+jwt},
                method: 'POST'
            }).then(function(response) {
                var jwt = response.data.jwt;
                //console.log("got renewed jwt:"+jwt);
                localStorage.setItem(appconf.jwt_id, jwt);
                return jwt;
            });
        }
        return jwt;
    }
    $httpProvider.interceptors.push('jwtInterceptor');
}]);


