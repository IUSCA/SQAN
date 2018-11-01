app.controller('TemplateSummaryController',
function($scope, appconf, toaster, $http, $location, serverconf) {
    
    $scope.$parent.active_menu = "tsummary";

    $scope.fields = ['IIBISID','Modality','StationName','radio_tracer','count'];
    $scope.fieldnames = ['IIBISID','Modality','Station Name','Radio Tracer','# Timestamps'];
    
    $scope.detailnames = ['Series Number','Series Description','Times used for QC','# Images'];

    $scope.sorting = {
        filter: '',
        fieldname: $scope.fieldnames[0]        
    };

    $scope.getTemplateSummary = function() {
        $http.get(appconf.api+'/templatesummary/istemplate').then(function(res) {
            $scope.templates = res.data;
            console.log($scope.templates.length + ' templates retrieved from exam db');
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
            
            $scope.rowNumber=index;
            $scope.templatebytimestamp = [];
            $scope.templatesUsed = [];

            $http.get(appconf.api+'/templatesummary/examids/'+research._id, {}).then(function(res) {
                console.log(res.data)                
                console.log(`Number of dates for this research -- ${res.data.length}`);                                                

                res.data.forEach(function(tbyt,j) {
                    var arrDetails = [];
                    $scope.templatesUsed[j] = 0;
                    tbyt.template_id.forEach(function(tid,i) {
                        var arrItems = {};                                            
                        arrItems['SeriesNumber'] = tbyt.SeriesNumber[i];
                        arrItems['series_desc'] = tbyt.series_desc[i];
                        arrItems['template_id'] = tid;

                        $http.get(appconf.api+'/templatesummary/series/'+tid, {}).then(function(res) {                            
                            if(res.data.length>0) {
                                arrItems['usedInQC'] = res.data[0].usedInQC;
                                $scope.templatesUsed[j]++;
                            }
                            else arrItems['usedInQC']=0                            
                        }, function(err) {
                            toaster.error("Error retrieving template details");
                            console.dir(err);
                        });

                        $http.get(appconf.api+'/templatesummary/imagecount/'+tid, {}).then(function(res) {                            
                            if(res.data.length>0) arrItems['imageCount']=res.data[0].imageCount
                            else arrItems['imageCount']=0                           
                        }, function(err) {
                            toaster.error("Error retrieving template details");
                            console.dir(err);
                        });
                        
                        arrDetails.push(arrItems)
                    })
                    var timestampObj = {};
                    timestampObj['date']=tbyt.date;
                    timestampObj['_id']=tbyt._id;
                    timestampObj['details']=arrDetails;
                    $scope.templatebytimestamp.push(timestampObj)
                })  
                console.log($scope.templatebytimestamp)
                console.log($scope.templatesUsed)
            }, function(err) {
                toaster.error("Error retrieving template details");
                console.dir(err);
            });                
        } else {$scope.rowNumber=-1};               
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