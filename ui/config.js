angular.module('app.config', [])
.constant('appconf', {
    title: 'SQAN QC',
    //assumes prod if not set
    mode: 'dev',
    api: '/api/qc',

    // kibana_url: '/kibana/',

    recent_study_days: "all", //default 60 days

    iucas_url: 'https://cas.iu.edu/cas/login',
    iucas_logout: 'https://cas.iu.edu/cas/logout',
    base_url: '',
    default_redirect_url: '/#/exams',
    //shared servive api and ui urls (for menus and stuff)
    // shared_api: '/api/shared',
    // shared_url: '/shared',
    //
    // //authentcation service API to refresh token, etc.
    // auth_api: '/api/auth',
    // auth_url: '/auth',

    jwt_id: 'jwt',
    //
    // event_api: '/api/event',
});

