'use strict';

var app = angular.module('app', [
    'app.config',
    'ngRoute',
    'ngCookies',
    'ngAnimate',
    'ngLocationUpdate',
    'toaster',
    'angular-loading-bar',
    'angular-jwt',
    'ui.bootstrap',
    'ui.bootstrap.tabs',
    'ui.select',
    'sca-ng-wf',
    'sca-product-raw',
    'ui.gravatar',
    'angular.filter',
    'gg.editableText'
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
    .when('/series/:seriesid', {
        templateUrl: 't/series.html',
        controller: 'SeriesController',
        requiresLogin: true
    })
    .when('/research/:researchid?', {
        templateUrl: 't/research.html',
        controller: 'ResearchController',
        requiresLogin: true,
    })
    .when('/template/:templateid', {
        templateUrl: 't/template.html',
        controller: 'TemplateController',
        requiresLogin: true
    })
    .when('/qc/:level/:researchid?/:subjectid?', {
        templateUrl: 't/qc.html',
        controller: 'QCController',
        requiresLogin: true
    })
    .when('/dump', {
        templateUrl: 't/dump.html',
        controller: 'DumpController',
        requiresLogin: true,
    })
    // .when('/handler', {
    //     templateUrl: 't/handler.html',
    //     controller: 'HandlerController',
    //     requiresLogin: true,
    // })
    .when('/admin', {
        templateUrl: 't/admin.html',
        controller: 'AdminController',
        requiresLogin: true,
    })
    .otherwise({
        redirectTo: '/qc/recent'
    });
}]).run(function($rootScope, $location, toaster, jwtHelper, appconf) {
    $rootScope.$on("$routeChangeStart", function(event, next, current) {
        //redirect to /login if user hasn't authenticated yet
        if(next.requiresLogin) {
            var jwt = localStorage.getItem(appconf.jwt_id);
            if(jwt == null || jwtHelper.isTokenExpired(jwt)) {
                sessionStorage.setItem('auth_redirect', document.location.toString());
                toaster.error("Please signin first!");
                document.location = appconf.auth_url;
                event.preventDefault();
            }
        }
    });
});

//configure httpProvider to send jwt unless skipAuthorization is set in config (not tested yet..)
app.config(['appconf', '$httpProvider', 'jwtInterceptorProvider', 
function(appconf, $httpProvider, jwtInterceptorProvider) {
    jwtInterceptorProvider.tokenGetter = function(jwtHelper, $http, toaster) {
        //if (config.url.substr(config.url.length - 5) == '.html') { return null; }
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

app.factory('users', ['appconf', '$http', 'jwtHelper', 'toaster', function(appconf, $http, jwtHelper, toaster) {
    return $http.get(appconf.auth_api+'/profile')
    .then(function(res) {
        var users = {};
        res.data.profiles.forEach(function(user) {
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

app.filter('uniqueSeriesDesc', function() {
    return function(items, props) {
        var descs = [];
        for(var date in items) {
            for(var desc in items[date]) {
                if(!~descs.indexOf(desc)) descs.push(desc);
            }
        }
        return descs;
    };
});

app.filter('findTemplate', function() {
    return function(items, props) {
        //console.dir(props);
        //console.dir(items);
        var templates = [];
        for(var desc in items) {
            for(var date in items[desc]) {
                if(date[0] == "$") continue; //ignore $key and $$hashKey
                items[desc][date].forEach(function(template) {
                    if(template._id == props) templates.push(template);
                });
            }
        }
        return templates;
    };
});

app.filter('objLength', function() {
    return function(object) {
        var count = 0;

        for(var i in object){
            count++;
        }
        return count;
    }
});
