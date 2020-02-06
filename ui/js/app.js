'use strict';

var app = angular.module('app', [
    'app.config',
    'ngRoute',
    'ngCookies',
    'ngAnimate',
    'ngSanitize',
    'ngLocationUpdate',
    'toaster',
    'angular-loading-bar',
    'angular-jwt',
    'ui.bootstrap',
    // 'ui.bootstrap.tabs',
    'ui.select',
    'sca-ng-wf',
    'sca-product-raw',
    'ui.gravatar',
    'angular.filter',
    'gg.editableText',
    'ngCsv'
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
        controller: 'AboutController',
        hideSidebar: true
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
    .when('/exams/:level?', {
        templateUrl: 't/exams.html',
        controller: 'ExamsController',
        requiresLogin: true
    })
    .when('/dump', {
        templateUrl: 't/dump.html',
        controller: 'DumpController',
        requiresLogin: true,
    })
    .when('/dataflow', {
        templateUrl: 't/dataflow.html',
        controller: 'DataflowController',
        requiresLogin: true,
    })
    .when('/summary/:iibisid?', {
        templateUrl: 't/summary.html',
        controller: 'SummaryController',
        requiresLogin: true,
    })
    .when('/report', {
        templateUrl: 't/report.html',
        controller: 'ReportController',
        requiresLogin: true,
    })
    .when('/templatesummary', {
        templateUrl: 't/templatesummary.html',
        controller: 'TemplateSummaryController',
        requiresLogin: true,
    })
    .when('/admin', {
        templateUrl: 't/admin.html',
        controller: 'AdminController',
        requiresLogin: true,
        requiresAdmin: true,
    })
    .when('/profile', {
        templateUrl: 't/profile.html',
        controller: 'ProfileController',
        requiresLogin: true,
    })
    .when('/signin', {
        templateUrl: 't/signin.html',
        controller: 'SigninController',
        hideSidebar: true
    })
    .when('/signout', {
        template: '',
        controller: 'SignoutController',
    })
    .otherwise({
        redirectTo: 'exams/all'
    });
}]).run(function($rootScope, $location, toaster, jwtHelper, appconf) {
    $rootScope.$on("$routeChangeStart", function(event, next, current) {

        var jwt = localStorage.getItem(appconf.jwt_id);
        if(jwt == null || jwtHelper.isTokenExpired(jwt)) {
            localStorage.removeItem(appconf.jwt_id);
            localStorage.removeItem('uid');
            localStorage.removeItem('role');
        };

        if(typeof(next.hideSidebar) !== 'undefined') {
            $rootScope.hideSidebar = next.hideSidebar;
        } else {
            $rootScope.hideSidebar = false;
        }

        //redirect to /signin if user hasn't authenticated yet
        if(next.requiresLogin) {
            if(jwt == null || jwtHelper.isTokenExpired(jwt)) {
                // toaster.warning("Please sign in first");
                console.log("Original path: ",next.OriginalPath);
                console.log(next.originalPath);
                sessionStorage.setItem('auth_redirect', next.originalPath);
                $location.path("signin");
                event.preventDefault();
            }
        };

        if(next.requiresAdmin) {
            let user = jwtHelper.decodeToken(jwt);
            console.log($scope.user);
            let isadmin = (~user.roles.indexOf('admin'))
            if(!isadmin){
                toaster.warning("You are not authorized to access "+next.originalPath);
                event.preventDefault();
            }
        };

        // //redirect to /login if user hasn't authenticated yet
        // if(next.requiresLogin) {
        //     var jwt = localStorage.getItem(appconf.jwt_id);
        //     if(jwt == null || jwtHelper.isTokenExpired(jwt)) {
        //         sessionStorage.setItem('auth_redirect', document.location.toString());
        //         toaster.error("Please signin first!");
        //         document.location = appconf.auth_url;
        //         event.preventDefault();
        //     }
        // }
    });
});

app.config(['$locationProvider', function($locationProvider) {
    $locationProvider.html5Mode(true);
}]);

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
    console.log("In the user factory!");
    return $http.get(appconf.api+'/user/all')
    .then(function(res) {
        var users = {};
        console.log(res.data);
        res.data.forEach(function(user) {
            users[user._id] = user;
        });
        return users;
    }, function(res) {
        if(res.data && res.data.message) toaster.error(res.data.message);
        else toaster.error(res.statusText);
    });
}]);

app.factory('groups', ['appconf', '$http', 'jwtHelper', 'toaster', function(appconf, $http, jwtHelper, toaster) {
    return $http.get(appconf.api+'/group/all')
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


function valuesToArray(obj) {
    return Object.keys(obj).map(function (key) { return obj[key]; });
}


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


// https://gist.github.com/Cacodaimon/7309268
app.filter('sumByKey', function() {
        return function(data, keyprops) {
            if (typeof(data) === 'undefined' || typeof(keyprops) === 'undefined') {
                return 0;
            }

            var sum = 0;
            if(typeof(keyprops[1]) !== 'undefined' ){
                var key = keyprops[0];
                var validkey = keyprops[1];
            } else {
                var key = keyprops;
                var validkey = false;
            }
            console.log(typeof(data));
            if(typeof(data) === 'object'){
                data = valuesToArray(data);
            }
            for (var i = data.length - 1; i >= 0; i--) {
                if(data[i][validkey] || !validkey){
                    sum += parseInt(data[i][key]);
                }
            }

            return sum;
        };
    });
