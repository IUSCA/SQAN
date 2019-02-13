app.controller('HandlerController',
function($scope, appconf, toaster, $http, $location, serverconf, $document, $window, $routeParams, $timeout) {
    $scope.appconf = appconf;
    $scope.model = {};
    $scope.model.hoverrow = '';

    $scope.response_types = [
        {
            name: 'none',
            style: 'info'
        },
        {
            name: 'log',
            style: 'info'
        },
        {
            name: 'warn',
            style: 'warning'
        },
        {
            name: 'error',
            style: 'danger'
        }
    ];

    $scope.handler_types = [
        {
            name: 'IGNORE',
            default_response: 'log',
            desc: 'Do not do any comparisons on this key'
        },
        {
            name: 'IGNORE_SERIES',
            default_response: 'log',
            desc: 'Do not run QC tests on series that match the given key (wildcards OK)',
        },
        {
            name: 'MISSING_OK',
            default_response: 'log',
            desc: 'OK for this key to exist in template but not in qc-image'
        },
        {
            name: 'EXACT_MATCH',
            default_response: 'error',
            desc: 'qc-value must match template value exactly'
        },
        {
            name: 'PERCENT_DIFF',
            default_response: 'error',
            default_value: 0.1,
            desc: 'Check that qc-value matches template value within +/- n%'
        },
        {
            name: 'ABSOLUTE_DIFF',
            default_response: 'error',
            default_value: 0.1,
            desc: 'Check that qc-value matches template value within +/- n'
        },
        {
            name: 'MINIMUM',
            default_response: 'warn',
            default_value: 0.1,
            desc: 'Check that qc-value is greater than n'
        },
        {
            name: 'MAXIMUM',
            default_response: 'warn',
            default_value: 0.1,
            desc: 'Check that qc-value is less than n'
        },
        {
            name: 'SUBSTRING_PRESENT',
            default_response: 'warn',
            default_value: '',
            desc: 'Check that qc-value contains given string'
        },
        {
            name: 'SUBSTRING_MISSING',
            default_response: 'warn',
            default_value: '',
            desc: 'Check that qc-value does not contain given string'
        }
    ];

    $scope.default_key = {
        'key': 'NewKey',
        'type': 'IGNORE'
    };

    $scope.handler_ids = ['IGNORE','MISSING_OK','IGNORE_SERIES','EXACT_MATCH','PERCENT_DIFF','ABSOLUTE_DIFF','MINIMUM','MAXIMUM','SUBSTRING_PRESENT','SUBSTRING_MISSING'];

    $scope.cloneme = function(target, row, idx) {
        var newrow = angular.copy(row);
        target.splice(idx, 0, newrow);
        console.log("cloning ");
    };

    $scope.removeme = function(target, idx) {
        target.splice(idx, 1);
        console.log("removing");
    };

    $scope.revert = function(target) {
        console.log(target);
        target.handlers = angular.copy($scope.originals[target._id].handlers);
        console.log("reverting");
    };

    $scope.newrow = function(target) {
        target.splice(0, 0, angular.copy($scope.default_key));
        console.log("made a new row");
    };

    $scope.addnote = function(target) {
        if(target.notes === undefined) {
            target.notes = [];
        }
        console.log($scope.user);

        target.notes.push(
            {
                text: "New note",
                user: $scope.user.profile.username,
                timestamp: Date.now()
            }
        );
    };

    $scope.save = function(target) {

        $http.post(appconf.api + '/handler/update/' + target._id, target)
            .then(function(res) {
                console.log(res);
                toaster.success("Updated Successfully!");
            }, $scope.toast_error);
    };

    $scope.selected = false;
    $scope.select = function(h) {
        if($scope.selected && $scope.selected !== $scope.originals[$scope.selected._id]){
            if(confirm("Do you want to abandon unsaved changes?")) {
                $scope.selected = h;
                $scope.myform.$setPristine();
            }
        } else {
            $scope.selected = h;
        }
    };

    $scope.updateHandlerType = function(h) {
        if(h.name === 'IGNORE'){
            h.response = undefined;
            h.value = undefined;
            return
        };

        $scope.handler_types.forEach(function(ht){
            if(ht.name == h.type){
                if(h.response === undefined && ht.default_response !== undefined){
                    h.response = ht.default_response;
                };
                console.log(h.value, ht.value);
                if(h.value === undefined && ht.default_value !== undefined){
                    h.value = ht.default_value;
                };
            }
        });
    };

    load();
    $scope.handlers;
    $scope.originals = {};
    function load() {
        $http.get(appconf.api + '/handler', {})
        .then(function (res) {
            console.log(res.data);
            $scope.handlers = res.data;

            for(h of res.data) {
                $scope.originals[h._id] = angular.copy(h);
            };
        });
    };
});