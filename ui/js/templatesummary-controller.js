app.controller('TemplateSummaryController',
function($scope, appconf, toaster, $http, $location, serverconf) {
    
    $scope.$parent.active_menu = "tsummary";

    $scope.fields = ['IIBISID','Modality','StationName','radio_tracer','count'];
    $scope.fieldnames = ['IIBISID','Modality','Station Name','Radio Tracer','# Study Instances'];
    
    $scope.detailnames = ['Series Number','Series Description','Times used for QC','# Images'];

    $scope.sorting = {
        filter: '',
        fieldname: $scope.fieldnames[0]        
    };

    $scope.getTemplateSummary = function() {
        $http.get(appconf.api+'/templatesummary/istemplate').then(function(res) {
            $scope.templates = res.data;
            console.log($scope.templates.length + ' templates retrieved from exam db');
            console.log($scope.templates);
        }, function(err) {
            console.log("Error contacting API");
            console.dir(err);
        });       
    };
    $scope.getTemplateSummary();

    $scope.rowNumber = -1;
    $scope.indexDetails=-1; 

    $scope.templatesByTimestamp = function(research,index){
       
        $scope.showDetails = false;
        $scope.indexDetails=-1;

        if($scope.rowNumber!==index){
                        
            $scope.templatebytimestamp = [];
            $scope.templatesUsed = [];

            research.exam_id.forEach(function(eid,ind) {
                //console.log(eid);
                $http.get(appconf.api+'/templatesummary/texams/'+eid,{}).then(function(res) {
                    console.log(res.data)
                    $scope.templatebytimestamp.push(res.data);
                    if ($scope.templatebytimestamp.length == research.exam_id.length) $scope.rowNumber=index;
                })
                
            })    

            console.log($scope.templatebytimestamp)
              
        } else {$scope.rowNumber=-1};      
        console.log('rowNumber is ' + $scope.rowNumber);         
    }   

    $scope.templateDetails = function(timestamp,index){
        console.log('index  ' + index)
        console.log('indexDetails ' + $scope.indexDetails)       

        if($scope.indexDetails!==index){  
            $scope.indexDetails=index;            
            $scope.showDetails = true; 
            console.log(timestamp)           
            $scope.details = timestamp; 
        } else {
            $scope.indexDetails=-1;
            $scope.showDetails = false;
            $scope.details = [];
        }
    }  
});