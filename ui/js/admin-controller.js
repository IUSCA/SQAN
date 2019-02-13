app.controller('AdminController', 
function($scope, appconf, toaster, $http, serverconf, groups) {
    $scope.appconf = appconf;
    $scope.$parent.active_menu = "admin";
    $scope._selected = {};
    $scope.selectall = false;
    serverconf.then(function(_serverconf) { $scope.serverconf = _serverconf; });

    $http.get(appconf.api+'/research', {params: {admin: true}})
    .then(function(res) {
        //find unique iibisids
        $scope.iibisids = [];
        res.data.forEach(function(research) {
            if(!~$scope.iibisids.indexOf(research.IIBISID)) $scope.iibisids.push(research.IIBISID);
        });

        groups.then(function(_groups) {
            $scope.groups = _groups;
            //conver to easy to lookup object
            $scope.groups_o = [];
            $scope.groups.forEach(function(group) {
                $scope.groups_o[group.id] = group;
            });
        });

        $http.get(appconf.api+'/acl/iibisid')
        .then(function(res) {
            console.log(res.data);
            $scope.acl = {};
            $scope._acl = {};
            res.data.forEach(function(iibis){
                $scope.acl[iibis.IIBISID] = {
                    qc: iibis.qc,
                    view: iibis.view
                }
            });

            $scope.iibisids.forEach(function(id) {
                console.log(id);
                //deal with case where acl is not set at all..
                if($scope.acl[id] == undefined) {
                    $scope.acl[id] = {
                        view: {groups: []},
                        qc: {groups: []},
                    };
                }

                $scope._acl[id] = {
                    view: {groups: []},
                    qc: {groups: []},
                };

                //convert group id to object
                for(var action in $scope.acl[id]) {
                    var acl = $scope.acl[id][action];
                    if(acl.groups) acl.groups.forEach(function(gid) {
                        $scope._acl[id][action].groups.push($scope.groups_o[gid]);
                    });
                }
            });
        }, $scope.toast_error);
    }, $scope.toast_error);

    $scope.update_acl = function() {
        //convert object to id
        for(var id in $scope._acl) {
            $scope.acl[id] = {}; //clear other junks
            for(var action in $scope._acl[id]) {
                var acl = $scope._acl[id][action];
                var ids = [];
                acl.groups.forEach(function(group) {
                    ids.push(group.id);
                });
                $scope.acl[id][action] = {groups: ids, users: []}; //TODO with users
            }
        };

        $http.put(appconf.api+'/acl/iibisid', $scope.acl)
        .then(function(res) {
            $scope.form.$setPristine();
            toaster.success("Updated Successfully!");
        }, $scope.toast_error);
    };


    $scope.reqc = function() {
        var selected = [];
        angular.forEach($scope._selected, function(s,k){
            if(s) selected.push(k);
        });
        $http.post(appconf.api+'/research/reqc', {IIBISID: { '$in': selected}})
            .then(function(res) {
                toaster.success(res.data.message);
            }, $scope.toast_error);
    };

    $scope.toggle_selectall = function() {
        $scope.selectall = !$scope.selectall;
        angular.forEach($scope._selected, function(s, k){
            $scope._selected[k] = $scope.selectall;
        });
    };

    $scope.selectedCount = function() {
        var count = 0;
        angular.forEach($scope._selected, function(s){
            count += s ? 1 : 0;
        });
        return count;
    }

});