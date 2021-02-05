import Vue from "vue";
import App from "./App.vue";
import router from "./router";
import store from "./store";

Vue.config.productionTip = false;

import config from './config';


import VueAnalytics from 'vue-ua'

Vue.use(VueAnalytics, {
  // [Required] The name of your app as specified in Google Analytics.
  appName: 'RADY QC',
  // [Required] The version of your app.
  appVersion: '2.0',
  // [Required] Your Google Analytics tracking ID.
  trackingId: config.analytics_id,
  // If you're using vue-router, pass the router instance here.
  vueRouter: router,

  trackPage: true,

  // // Global Dimensions and Metrics can optionally be specified.
  // globalDimensions: [
  //     { dimension: 1, value: 'FirstDimension' },
  //     { dimension: 2, value: 'SecondDimension' }
  //     // Because websites are only 2D, obviously. WebGL? What's that?
  // ],
  //
  // globalMetrics: [
  //     { metric: 1, value: 'MyMetricValue' },
  //     { metric: 2, value: 'AnotherMetricValue' }
  // ]
});


Vue.prototype.$config = config;

//clipboard
import VueClipboard from 'vue-clipboard2'
VueClipboard.config.autoSetContainer = true;
Vue.use(VueClipboard);

//Gravatar
import Gravatar from 'vue-gravatar';
Vue.component('v-gravatar', Gravatar);

//Axios
import Axios from "axios";

Vue.prototype.$http = Axios;
Axios.interceptors.request.use(
  config => {
    let token = store.state.auth.jwt;

    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }

    return config;
  },

  error => {
    return Promise.reject(error);
  }
);

//Local glopbal helper functions
import helpers from './plugins/helpers';
Object.defineProperty(Vue.prototype, '$helpers', { value: helpers });

//Notifications
import Notifications from "vue-notification";

Vue.use(Notifications);

//Date filtering
Vue.use(require('vue-moment'));

//Filters
import "./filters.js";

import vuetify from './plugins/vuetify';

new Vue({
  router,
  store,
  vuetify,
  render: h => h(App)
}).$mount("#app");
