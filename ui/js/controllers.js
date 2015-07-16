'use strict';

/*
 * Right now, we are going to have a single module for our app which contains
 * all controllers. In the future, we should refactor into multiple modules. When I do, don't forget
 * to add it to app.js's module list
 * */

app.controller('ListController', ['$scope', 'appconf', 'toaster', '$http', 'jwtHelper', '$cookies', '$location',
function($scope, appconf, toaster, $http, jwtHelper, $cookies, $location) {

    //make sure we have good jwt
    var jwt = localStorage.getItem(appconf.jwt_id);
    var needlogin = false;
    if(!jwt) {
        needlogin = true;
    } else {
        var expdate = jwtHelper.getTokenExpirationDate(jwt);
        var ttl = expdate - Date.now();
        if(ttl < 0) {
            needlogin = true;
        }
    }

    if(needlogin) {
        console.log("user doesn't have valid jwt token - redirecting to login page");
        document.location = appconf.url.loginurl+"?redirect="+document.location;
        return;
    }

    $scope.title = appconf.title;
    $scope.studies = [];
    
    //console.dir(jwt);
    //toaster.pop('error', 'title', 'Hello there');
    //toaster.pop('success', 'title', 'Hello there');
    //toaster.pop('wait', 'title', 'Hello there');
    //toaster.pop('warning', 'title', 'Hello there');
    //toaster.pop('note', 'title', 'Hello there');
    //toaster.success('title', 'Hello there');
    //toaster.error('title', 'Hello there');

    $scope.loading = false;
    $scope.loadresults = function(num) {
        $scope.loading = true;
        var count = $scope.studies.length;
        $http.get(appconf.api.qc+'/studies', {params: {start: count, end: count+num}})
        .success(function(studies, status, headers, config) {
            //add last minute stuff
            studies.forEach(function(study) {
                //console.dir(study);
                for(var seriesid in study.serieses) {
                    var series = study.serieses[seriesid];
                    var index = "dicom-"+study.esindex.split(".")[0]+".*";
                    series._kibana_url = appconf.url.kibana+"#/discover?_g=()&_a=(columns:!(_source),index:'"+index+"',interval:auto,query:(query_string:(analyze_wildcard:!t,query:'SeriesInstanceUID:"+seriesid+"')),sort:!('@timestamp',desc))";
                    series._instance_count = Object.keys(series.instances).length;
                }
            });
            $scope.studies = $scope.studies.concat(studies); //add to current list
            $scope.loading = false;
        });
    }
    $scope.loadresults(10);
    /*
    $scope.open_instance = function(date, studyid, seriesid, instid) {
        $location.path('/instance/'+date+'/'+studyid+'/'+seriesid+'/'+instid);
    }
    */
    $scope.show_seriesid = null;
    $scope.active_instid = null;
    $scope.load_instance = function(studyid, seriesid, instid) {
        $http.get(appconf.api.qc+'/series', {params: {studyid:studyid, seriesid:seriesid}})
        .success(function(series, status, headers, config) {
            //console.dir(series);
            $scope.show_seriesid = seriesid;
            $scope.instance_detail = series.instances[instid];
            $scope.active_instid = instid;
        });
    }
}]);

/*
app.controller('SeriesController', ['$scope', 'appconf', 'toaster', '$http', 'jwtHelper', '$cookies', '$routeParams', '$location', 
function($scope, appconf, toaster, $http, jwtHelper, $cookies, $routeParams, $location) {
    $scope.appconf = appconf;
    $scope.date = $routeParams.date;
    $scope.studyid = $routeParams.studyid;
    $scope.seriesid = $routeParams.seriesid;

    //TODO - maybe dangerous to let user access jwt so easily..
    //$scope.jwt = localStorage.getItem(appconf.jwt_id);

    $http.get(appconf.api.qc+'/series', {params: $routeParams })
    .success(function(data, status, headers, config) {
        $scope.series = data;
    });
    $scope.open_instance = function(instid) {
        $location.path('/instance/'+$scope.date+'/'+$scope.studyid+'/'+$scope.seriesid+'/'+instid);
    }
}]);
*/

app.controller('InstanceController', ['$scope', 'appconf', 'toaster', '$http', 'jwtHelper', '$cookies', '$routeParams', '$location', 
function($scope, appconf, toaster, $http, jwtHelper, $cookies, $routeParams, $location) {
    $scope.appconf = appconf;

    //for ui
    $scope.date = $routeParams.date;
    $scope.studyid = $routeParams.studyid;
    $scope.seriesid = $routeParams.seriesid;
    $scope.instid = $routeParams.instid;

    $scope.headerfilter = "";
    //TODO - maybe dangerous to let user access jwt so easily..
    //$scope.jwt = localStorage.getItem(appconf.jwt_id);
    $scope.filtered = function(items) {
        var result = {};
        angular.forEach(items, function(value, key) {
            if(key.toLowerCase().indexOf($scope.headerfilter.toLowerCase()) !== -1) {
                result[key] = JSON.stringify(value);
            }
        });
        return result;
    }

    $http.get(appconf.api.qc+'/series', {params: $routeParams })
    .success(function(data, status, headers, config) {
        $scope.series = data;
    });
    $http.get(appconf.api.qc+'/instance', {params: $routeParams })
    .success(function(data, status, headers, config) {
        $scope.instance = data;
    });
    $scope.open_instance = function(instid) {
        $location.path('/instance/'+$scope.date+'/'+$scope.studyid+'/'+$scope.seriesid+'/'+instid);
    }
}]);
