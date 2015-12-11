angular.module('app.config', [])
.constant('appconf', {
    title: 'Dicom QC',

    api: '/api/dicom',

    kibana_url: '/kibana/',

    profile_api: '/api/profile',
    profile_url: '/profile',

    //shared servive api and ui urls (for menus and stuff)
    shared_api: '/api/shared',
    shared_url: '/shared',

    //authentcation service API to refresh token, etc.
    auth_api: '/api/auth',
    auth_url: '/auth',

    jwt_id: 'jwt',
    menu: [
        {
            id: "about",
            label: "About",
            url: "/dicom/#/about",
        },
        {
            id: "recent",
            label: "Recent Study",
            url: "/dicom/#/recent",
            show: function(scope) {
                if(~scope.dicom.indexOf('admin')) return true;
                return false;
            }
        },
        {
            id: "admin",
            label: "Administration",
            url: "/dicom/#/admin",
            show: function(scope) {
                if(~scope.common.indexOf('admin')) return true;
                return false;
            }
        },
    ]    
});

