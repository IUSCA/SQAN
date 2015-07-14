'use strict';

angular.module('app.config', [])
.constant('appconf', {
    version: '0.0.1',
    title: 'QC Report',
    api: {
        qc: 'https://soichi7.ppa.iu.edu/api/qc',
        auth: 'https://soichi7.ppa.iu.edu/api/auth',
    },
    url: {
        loginurl: 'https://soichi7.ppa.iu.edu/auth#/login', //set ?redirect=<url to redirect back>
    },

    jwt_id: 'jwt'
});

