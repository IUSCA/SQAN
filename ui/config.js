angular.module('app.config', [])
.constant('appconf', {
    title: 'RADY QC',
    //assumes prod if not set
    mode: 'dev',
    api: '/api/qc',

    kibana_url: '/kibana/',

    recent_study_days: "all", //default 60 days

    iucas_url: 'https://cas.iu.edu/cas/login',
    iucas_logout: 'https://cas.iu.edu/cas/logout',
    base_url: '',
    default_redirect_url: '/exams',
    //shared servive api and ui urls (for menus and stuff)
    shared_api: '/api/shared',
    shared_url: '/shared',

    //authentcation service API to refresh token, etc.
    auth_api: '/api/auth',
    auth_url: '/auth',

    jwt_id: 'jwt',

    event_api: '/api/event',
    /*
    menu: [
        {
            id: "research",
            label: "All Exams",
            url: "/dicom/#/research",
            show: function(scope) {
                if(~scope.dicom.indexOf('user')) return true;
                return false;
            }
        },
        {
            id: "recent",
            label: "Recent Exams",
            url: "/dicom/#/recent",
            show: function(scope) {
                if(~scope.dicom.indexOf('user')) return true;
                return false;
            }
        },
        {
            id: "qc1",
            label: "QC1 Pending",
            url: "/dicom/#/qc/1",
            show: function(scope) {
                if(~scope.dicom.indexOf('user')) return true;
                return false;
            }
        },
        {
            id: "qc2",
            label: "QC2 Pending",
            url: "/dicom/#/qc/2",
            show: function(scope) {
                if(~scope.dicom.indexOf('user')) return true;
                return false;
            }
        },
        {
            id: "admin",
            label: "Management",
            url: "/dicom/#/admin",
            show: function(scope) {
                if(~scope.dicom.indexOf('admin')) return true;
                return false;
            }
        },
        {
            id: "about",
            label: "About",
            url: "/dicom/#/about",
        },
    ]
    */
});

