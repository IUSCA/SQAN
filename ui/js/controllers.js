'use strict';

/*
 * Right now, we are going to have a single module for our app which contains
 * all controllers. In the future, we should refactor into multiple modules. When I do, don't forget
 * to add it to app.js's module list
 * */

app.controller('AboutController', ['$scope', 'appconf', 'toaster', '$http', 'jwtHelper', '$cookies', '$location', 'menu', 'serverconf',
function($scope, appconf, toaster, $http, jwtHelper, $cookies, $location, menu, serverconf) {
    menu.then(function(_menu) { $scope.menu = _menu; });
    serverconf.then(function(_serverconf) { $scope.serverconf = _serverconf; });
    //todo
}]);

app.controller('RecentController', ['$scope', 'appconf', 'toaster', '$http', 'jwtHelper', '$cookies', '$location', 'menu', 'serverconf',
function($scope, appconf, toaster, $http, jwtHelper, $cookies, $location, menu, serverconf) {
    menu.then(function(_menu) { $scope.menu = _menu; });
    serverconf.then(function(_serverconf) { $scope.serverconf = _serverconf; });
    $scope.appconf = appconf;

    $http.get(appconf.api+'/study/recent')
    .then(function(res) {

        var researches = {};
        res.data.researches.forEach(function(research) {
            researches[research._id] = research;
        });
        
        var serieses = {};
        res.data.serieses.forEach(function(series) {
            serieses[series._id] = series;
            //series.research = researches[series.research_id];
        });

        $scope.researches = {};
        
        //add series/research object references
        res.data.studies.forEach(function(study) {
            study.series = serieses[study.series_id];
            
            //organize each study under research / series
            var research = $scope.researches[study.series.research_id];
            if(research === undefined) {
                research = {
                    research: researches[study.series.research_id],
                    serieses: {}
                };
                $scope.researches[study.series.research_id] = research;
            }
            var series = research.serieses[study.series_id];
            if(series === undefined) {
                series = {
                    series: serieses[study.series_id],
                    templates: {},
                    studies: {}
                }
                research.serieses[study.series_id] = series;
            }
            series.studies[study._id] = study;

            //find templates for this series
            res.data.templates.forEach(function(template) {
                if(template.series_id == study.series_id) series.templates[template._id] = template;
            });
        });
    });
    
    $scope.load_study = function(study) {
        //load qc results for each study (just queue request up and let browser take care of it)
        //study.loading = true;
        if(study.images) return; //already loaded
        $http.get(appconf.api+'/study/qc/'+study._id)
        .then(function(res) {
            //study.loading = false;
            study.images = res.data;
            study.images.forEach(computeColor);
        });
    }

    $scope.load_image = function(study, series, image) {
        study.active_image = image;
        study.loading = true;
        $http.get(appconf.api+'/image/'+image._id)
        .then(function(res) {
            study.loading = false;
            study.active_tab = "issues";
            for(var k in res.data) {
                study.active_image[k] = res.data[k];
            }

            if(res.data.qc) {
                //load template if qc-ed
                //TODO - template might be missing even if it's qc-ed?
                var template = series.templates[res.data.qc.template_id];
                if(template)  {
                    $http.get(appconf.api+'/template/'+template._id+'/'+image.headers.InstanceNumber)
                    .then(function(res) {
                        console.dir(res.data);
                        study.active_image.template = res.data;
                    });
                }
            }
        });
    }

    function computeColor(image) {
        var h = 0; 
        var s = "0%"; //saturation (default to gray)
        var l = "50%"; //light
        if(image.qc) {
            if(image.qc.e > 0) {
                h = 0; //red
                var _s = 50-image.qc.e;
                if(_s < 0) _l = 0;
                s = _s+"%";
            } else if(image.qc.w > 0) {
                h = 60; //yellow
                var _s = 50-image.qc.w;
                if(_s < 0) _l = 0;
                s = _s+"%";
            } else {
                console.log("green!");
                h = 120; //green
                s = "50%";
            }
        }
        image.color = "hsl("+h+","+s+","+l+")";
    }

    $scope.invalidate_qc = function(study) {
        $http.put(appconf.api+'/study/qc/invalidate/'+study._id)
        .then(function(res) {
            toaster.success("Invalidated");
            //TODO reload study
        });
    }
}]);

app.controller('StudyController', ['$scope', 'appconf', 'toaster', '$http', 'jwtHelper', '$cookies', '$location', 'menu', 'serverconf',
function($scope, appconf, toaster, $http, jwtHelper, $cookies, $location, menu, serverconf) {
    menu.then(function(_menu) { $scope.menu = _menu; });
    serverconf.then(function(_serverconf) { $scope.serverconf = _serverconf; });
    //var jwt = localStorage.getItem(appconf.jwt_id);
    //var user = jwtHelper.decodeToken(jwt);

    /*
    return $http.get(appconf.api+'/study/recent')
    .then(function(res) {
        $scope.studies = res.data.studies;
        $scope.serieses = res.data.serieses;
        $scope.researches = res.data.researches;
    });
    */
}]);


