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
    'angular-inview',
    'ui.bootstrap',
    'ui.bootstrap.tabs',
    'sca-shared',
]);

//show loading bar at the page top
app.config(['cfpLoadingBarProvider', function(cfpLoadingBarProvider) {
    cfpLoadingBarProvider.includeSpinner = false;
}]);

//can't quite do the slidedown animation through pure angular/css.. borrowing slideDown from jQuery..
app.animation('.slide-down', ['$animateCss', function($animateCss) {
    return {
        enter: function(elem, done) {
            $(elem).hide().slideDown("slow", done);
        },
        leave: function(elem, done) {
            $(elem).slideUp("slow", done);
        }
    };
}]);

/*
//http://stackoverflow.com/questions/26474920/order-by-object-key-in-ng-repeat
app.filter('toArray', function() { return function(obj) {
    if (!(obj instanceof Object)) return obj;
    return _.map(obj, function(val, key) {
        return Object.defineProperty(val, '$key', {__proto__: null, value: key});
    });
}});
*/

//configure route
app.config(['$routeProvider', 'appconf', function($routeProvider, appconf) {
    $routeProvider.
    when('/study', {
        templateUrl: 't/study.html',
        controller: 'StudyController',
        requiresLogin: true
    })
    .when('/about', {
        templateUrl: 't/about.html',
        controller: 'AboutController'
    })
    .when('/recent', {
        templateUrl: 't/recent.html',
        controller: 'RecentController'
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
        redirectTo: '/about'
    });
    
    //console.dir($routeProvider);
}]).run(['$rootScope', '$location', 'toaster', 'jwtHelper', 'appconf', function($rootScope, $location, toaster, jwtHelper, appconf) {
    $rootScope.$on("$routeChangeStart", function(event, next, current) {
        //redirect to /login if user hasn't authenticated yet
        if(next.requiresLogin) {
            var jwt = localStorage.getItem(appconf.jwt_id);
            if(jwt == null || jwtHelper.isTokenExpired(jwt)) {
                //localStorage.setItem('post_auth_redirect', next.originalPath);
                document.location = appconf.auth_url+"?redirect="+encodeURIComponent(document.location);
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
        if (config.url.substr(config.url.length - 5) == '.html') {
            return null;
        }

        var jwt = localStorage.getItem(appconf.jwt_id);
        if(!jwt) return null; //not jwt

        //TODO - I should probably put this in $interval instead so that jwt will be renewed regardless
        //of if user access server or not.. (as long as the page is opened?)
        //(also, make it part of shared or auth module?)
        var expdate = jwtHelper.getTokenExpirationDate(jwt);
        var ttl = expdate - Date.now();
        if(ttl < 0) {
            toaster.error("Your login session has expired. Please re-sign in");
            localStorage.removeItem(appconf.jwt_id);
            return null;
        } else if(ttl < 3600*1000) {
            //console.dir(config);
            console.log("jwt expiring in an hour.. refreshing first");
            //jwt expring in less than an hour! refresh!
            return $http({
                url: appconf.auth_api+'/refresh',
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
    return $http.get(appconf.shared_api+'/menu/top').then(function(res) {
        menu.top = res.data;

        //then load user profile (if we have jwt)
        var jwt = localStorage.getItem(appconf.jwt_id);
        if(!jwt)  return menu;
        var user = jwtHelper.decodeToken(jwt);
        //TODO - jwt could be invalid
        return $http.get(appconf.profile_api+'/public/'+user.sub);
    }, function(err) {
        console.log("failed to load /menu/top");
    }).then(function(res) {
        //TODO - this function is called with either valid profile, or just menu if jwt is not provided... only do following if res is profile
        //if(res.status != 200) return $q.reject("Failed to load profile");
        menu._profile = res.data;
        return menu;
    }, function(err) {
        console.log("couldn't load profile");
    });
}]);

