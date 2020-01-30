angular.module('app.config', [])
    .constant('appconf', {
        title: 'RADY-SQAN',

        mode: 'prod', //one of dev,prod,demo
        api: '/api/qc',
        small_logo: 'images/radyqc.png',
        big_logo: 'images/sqan_logo_full.png',


        recent_study_days: "all", //default 60 days

        iucas_url: 'https://cas.iu.edu/cas/login',
        iucas_logout: 'https://cas.iu.edu/cas/logout',
        base_url: '',
        default_redirect_url: 'exams/all',


        jwt_id: 'jwt',

    });
