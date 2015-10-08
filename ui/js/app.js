'use strict';

var app = angular.module('app', [
    'app.config',
    'ngSanitize',
    'ngRoute',
    'ngCookies',
    'ngAnimate',
    'toaster',
    'angular-loading-bar',
    'angular-jwt',
    'ui.bootstrap',
    'sca-shared',
]);

//show loading bar at the page top
app.config(['cfpLoadingBarProvider', function(cfpLoadingBarProvider) {
    cfpLoadingBarProvider.includeSpinner = false;
}]);

//configure route
app.config(['$routeProvider', 'appconf', function($routeProvider, appconf) {
    $routeProvider.
    when('/study', {
        templateUrl: 't/study.html',
        controller: 'StudyController',
        requiresLogin: true
    })
    /*
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
    */
    .otherwise({
        redirectTo: '/study'
    });
    
    //console.dir($routeProvider);
}]).run(['$rootScope', '$location', 'toaster', 'jwtHelper', 'appconf', function($rootScope, $location, toaster, jwtHelper, appconf) {
    $rootScope.$on("$routeChangeStart", function(event, next, current) {
        //redirect to /login if user hasn't authenticated yet
        if(next.requiresLogin) {
            var jwt = localStorage.getItem(appconf.jwt_id);
            if(jwt == null || jwtHelper.isTokenExpired(jwt)) {
                //localStorage.setItem('post_auth_redirect', next.originalPath);
                document.location = appconf.url.login+"?redirect="+encodeURIComponent(document.location);
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
            document.location = appconf.url.login+"?redirect="+encodeURIComponent(document.location);
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

//just a service to load all users from auth service
app.factory('serverconf', ['appconf', '$http', 'jwtHelper', function(appconf, $http, jwtHelper) {
    return $http.get(appconf.api+'/config')
    .then(function(res) {
        return res.data;
    });
}]);

//http://www.codelord.net/2015/09/24/$q-dot-defer-youre-doing-it-wrong/
//https://www.airpair.com/angularjs/posts/angularjs-promises
app.factory('menu', ['appconf', '$http', 'jwtHelper', function(appconf, $http, jwtHelper) {
    var menu = {};
    return $http.get(appconf.shared_api+'/menu').then(function(res) {
        //look for top menu
        //TODO - add ?id= param to shared_api/menu so that I don't have to do this - ant don't load unnecessary stuff
        res.data.forEach(function(m) {
            switch(m.id) {
            case 'top':
                menu.top = m;
                break;
            }
        });

        //then load user profile (if we have jwt)
        var jwt = localStorage.getItem(appconf.jwt_id);
        if(!jwt)  return menu;
        var user = jwtHelper.decodeToken(jwt);
        //TODO - jwt could be invalid
        return $http.get(appconf.profile_api+'/public/'+user.sub);
    }, function(err) {
        console.log("failed to load menu");
    }).then(function(res) {
        //TODO - this function is called with either valid profile, or just menu if jwt is not provided... only do following if res is profile
        //if(res.status != 200) return $q.reject("Failed to load profile");
        menu._profile = res.data;
        return menu;
    }, function(err) {
        console.log("couldn't load profile");
    });
}]);

