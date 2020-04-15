import Vue from "vue";
import App from "./App.vue";
import router from "./router";
import store from "./store";

Vue.config.productionTip = false;

import config from './config';

Vue.prototype.$config = config;

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
