app.controller('QckeyController',
    function($scope, appconf, toaster, groups, $http, $location, serverconf, $routeParams, $uibModal) {
        $scope.$parent.active_menu = "qckeys";
        $scope.appconf = appconf;
        $scope.modalities = ['common','MR','CT','PT']

        $scope.keys = [];
        $scope.skipall = false;

        //
        // $scope.newKey = {
        //     key: '',
        //     skip: true,
        //     custom: false,
        //     modality: 'common'
        // };

        $scope.toggleSkip = function(){
            let newval = !$scope.skipall;
            $scope.skipall = newval;
            $scope.keys.forEach(k => {
                k.skip = newval;
            });
        };

        $scope.getQCKeys = function(){
            $http.get(appconf.api+'/qc_keywords/allkeys')
                .then(function(res) {
                    console.log(res.data);
                    $scope.keys = res.data;
                }, $scope.toast_error);
        };

        $scope.updateKeys = function() {
            $http.patch(appconf.api+'/qc_keywords', $scope.keys)
                .then(function(res) {
                    console.log(res.data);
                    toaster.success(`${res.data.msg}  Recommend re-running QC on affected datasets.`);
                }, $scope.toast_error)
        };

        $scope.getQCKeys();
        // $scope.addKey = function() {
        //     $http.post(appconf.api'/qc_keywords', $scope.keys)
        //         .then(function(res) {
        //             console.log(res.data);
        //             toaster.success("Updated QC keywords!  Recommend re-running QC on affected datasets.");
        //         }, $scope.toast_error)
        // };

        $scope.new_keys = [];

        $scope.scanDB = function() {
            $http.get(appconf.api+'/qc_keywords/scandb')
                .then(function(res) {
                    $scope.new_keys = res.data;
                    toaster.success(`Scanned database and found ${res.data.length} unregistered keywords`);
                }, $scope.toast_error);
        };

        $scope.registerNewKeys = function() {

            $scope.new_keys.forEach(nk => {
                let newKey = {
                    key: nk,
                    skip: true,
                    custom: false,
                    modality: 'common'
                };

                $scope.new_keys = $scope.new_keys.filter(item => item !== nk);

                $http.post(appconf.api+'/qc_keywords', newKey)
                    .then(function(res) {
                        console.log(res.data);
                        toaster.success(`Added QC keyword ${nk}`);
                        $scope.getQCKeys();
                    }, $scope.toast_error)
            });
        };

        $scope.deleteKey = function(_id) {
            $http.delete(appconf.api+'/qc_keywords/'+_id)
                .then(function(res){
                    console.log(res.data);
                    $scope.keys = $scope.keys.filter(item => item._id !== _id);
                    toaster.success("Deleted keyword");

                }, $scope.toast_error);
        };


        $scope.openAdd = function () {
            $uibModal.open({
                templateUrl: 't/components/addqckey.html',
                size: 'lg',
                controller: function ($scope, $uibModalInstance) {

                    $ctrl = $scope;
                    $scope.newKey = {
                        key: '',
                        skip: true,
                        custom: false,
                        modality: 'common'
                    };

                    $scope.submit = function () {
                        $uibModalInstance.close($scope.newKey);
                    };

                    $scope.cancel = function () {
                        $uibModalInstance.dismiss('cancel2');
                    };
                }
            }).result.then(function(result){

                console.log(result);

                $http.post(appconf.api+'/qc_keywords', result)
                    .then(function(res) {
                        console.log(res.data);
                        toaster.success("Updated QC keywords!  Recommend re-running QC on affected datasets.");
                        $scope.getQCKeys();
                    }, $scope.toast_error)

            }, function(result){
                console.log('cancel or escaped');
                console.log(result);
            });
        }

        // $scope.getIngestions();
    });
