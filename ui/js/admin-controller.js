app.controller('AdminController',
function($scope, appconf, toaster, $http, serverconf, users, groups) {
    $scope.appconf = appconf;
    $scope.$parent.active_menu = "admin";
    $scope._selected = {};
    $scope.selectall = false;
    $scope.users_o = [];
    $scope.show_userform = false;
    $scope.userform = {};
    $scope.groupform = {};
    $scope.active_tab = 0;
    $scope.user_roles = [
        'user',
        'guest',
        'admin',
        'technologist',
        'researcher'
    ];


    $http.get(appconf.api+'/user/all')
        .then(function(res) {
            $scope.users = res.data;
            console.log($scope.users);
        }, function(res) {
            toaster.error(res.statusText);
        });

    $scope.editUser = function(user){
        $scope.show_userform = true;
        $scope.userform = user;
    };

    $scope.createUser = function(){
        $scope.show_userform = true;
        $scope.userform = {
            username : '',
            email: '',
            fullname: '',
            primary_role: 'user',
            roles: ['user']
        };
    };

    $scope.hideUserform = function(){
        $scope.show_userform = false;
        $scope.active_tab = 0;
    }

    $scope.hideGroupform = function(){
        $scope.show_groupform = false;
        $scope.active_tab = 1;
    }

    $scope.submitUserform = function(){
        $scope.show_userform = false;
        $scope.active_tab = 0;
        if($scope.userform._id !== undefined) {
            toaster.success("Updating user!");
            $http.patch(appconf.api+'/user/'+$scope.userform._id, $scope.userform)
                .then(function(res) {
                console.log(res.data);
                toaster.success("User updated!");
            }, $scope.toast_error);
        } else {
            toaster.success("Creating new user!");
            $http.post(appconf.api+'/user', $scope.userform)
                .then(function(res) {
                    console.log(res.data);
                    toaster.success("New user created, refreshing user list");
                    $http.get(appconf.api+'/user/all')
                        .then(function(res) {
                            var users = {};
                            console.log(res.data);
                            $scope.users = res.data;
                            res.data.forEach(function(user) {
                                users[user._id] = user;
                            });
                            $scope.users_o = users;
                        }, function(res) {
                            if(res.data && res.data.message) toaster.error(res.data.message);
                            else toaster.error(res.statusText);
                        });
                }, $scope.toast_error);
        }
    };

    $scope.editGroup = function(group){
        $scope.show_groupform = true;
        $scope.groupform = group;
    };

    $scope.createGroup = function(){
        $scope.show_groupform = true;
        $scope.groupform = {
            name : '',
            desc: '',
            members: [],
        };
    };

    $scope.submitGroupform = function(){
        $scope.show_groupform = false;
        $scope.active_tab = 1;
        if($scope.groupform._id !== undefined) {
            toaster.success("Updating group!");
            console.log($scope.groupform);
            $http.patch(appconf.api+'/group/'+$scope.groupform._id, $scope.groupform)
                .then(function(res) {
                    console.log(res.data);
                    toaster.success("Group updated!");
                }, $scope.toast_error);
        } else {
            toaster.success("Creating new group!");
            $http.post(appconf.api+'/group', $scope.groupform)
                .then(function(res) {
                    console.log(res.data);
                    toaster.success("New group created, refreshing group list");
                    $http.get(appconf.api+'/group/all')
                        .then(function(res) {
                            $scope.groups = res.data;
                        }, function(res) {
                            if(res.data && res.data.message) toaster.error(res.data.message);
                            else toaster.error(res.statusText);
                        });
                }, $scope.toast_error);
        }
    };

    serverconf.then(function(_serverconf) { $scope.serverconf = _serverconf; });

    $http.get(appconf.api+'/research', {params: {admin: true}})
    .then(function(res) {
        //find unique iibisids
        $scope.iibisids = [];
        res.data.forEach(function(research) {
            if(!~$scope.iibisids.indexOf(research.IIBISID)) $scope.iibisids.push(research.IIBISID);
        });

        users.then(function(_users) {
            $scope.users_o = _users;
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
