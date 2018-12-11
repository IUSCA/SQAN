app.controller('TemplateSummaryController',
function($scope, appconf, toaster, $http, $location, serverconf) {
    
    $scope.$parent.active_menu = "tsummary";

    $scope.fields = ['IIBISID','Modality','StationName','radio_tracer','count'];
    $scope.fieldnames = ['IIBISID','Modality','Station Name','Radio Tracer','# Study Instances'];
    
    $scope.tseriesTable = ['Series Number','Series Description','Times used for QC','# Images'];

    $scope.sorting = {
        filter: '',
        fieldname: $scope.fieldnames[0]        
    };

    $scope.currentResearch = null;

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
    $scope.indexShowSeries=-1; 

    $scope.templatesByTimestamp = function(research,index){
       
        $scope.indexShowSeries=-1;

        if($scope.rowNumber!==index){
               
            $scope.currentResearch = research;
            console.log($scope.currentResearch);

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
              
        } else {
            $scope.rowNumber=-1;
            $scope.currentResearch = null;
        };      
        console.log('rowNumber is ' + $scope.rowNumber);         
    }   

    $scope.getTemplateSeries = function(timestamp,index){
        console.log('index  ' + index)
        console.log('indexShowSeries ' + $scope.indexShowSeries)   

        $scope.series2delete = [];
        
        if($scope.indexShowSeries!==index){  
            $scope.indexShowSeries=index; 
            console.log(timestamp)           
            $scope.templateSeries = timestamp; 
            
        } else {
            $scope.indexShowSeries=-1;
            $scope.templateSeries = [];
        }
    } 

    $scope.deleteThisSeries = function(templateSeries){
        console.log(templateSeries);
        var indx = $scope.series2delete.indexOf(templateSeries.template_id);
        if (indx == -1) $scope.series2delete.push(templateSeries.template_id);
        if (indx != -1) $scope.series2delete.splice(indx,1);
        console.log($scope.series2delete);
    }


    $scope.deleteSelectedSeries = function(timestamp,index) {
        console.log(timestamp);
        console.log($scope.series2delete)


        $scope.series2delete.forEach(function(ts,ind1){
            $http.get(appconf.api+'/templatesummary/deleteselected/'+ts,{}).then(function(res) {
                console.log(res.data);
                timestamp.series.forEach(function(ss,ind2){
                    if (ss.template_id == ts){
                        $scope.series2delete.splice(ind1,1);
                        timestamp.series.splice(ind2,1);
                        return;
                    }
                }); 
            })
            if ($scope.series2delete.length == 0) {
                $scope.indexShowSeries = -1;
                $scope.getTemplateSeries(timestamp,index);
            }
        })       
    }


    $scope.deleteTemplate = function(texam_id,index) {
        console.log(texam_id);
        $http.get(appconf.api+'/templatesummary/deleteall/'+texam_id,{}).then(function(res) {
            console.log(res.data) 
            // var index = $scope.rowNumber;
            // $scope.rowNumber = -1;
            // var research = $scope.currentResearch;
            $scope.templatebytimestamp.splice(index,1);
        })
    }





});