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


// //Bootstrap
// import { BootstrapVue, BootstrapVueIcons } from "bootstrap-vue";
// import "bootstrap/dist/css/bootstrap.css";
// import "bootstrap-vue/dist/bootstrap-vue.css";
// import "bootswatch/dist/yeti/bootstrap.min.css";
//
// Vue.use(BootstrapVue);
// Vue.use(BootstrapVueIcons);
//
// //FontAwesome
// import { library } from "@fortawesome/fontawesome-svg-core";
//
// import {
//   FontAwesomeIcon,
//   FontAwesomeLayers,
//   FontAwesomeLayersText
// } from "@fortawesome/vue-fontawesome";
//
// Vue.component("font-awesome-icon", FontAwesomeIcon);
// Vue.component("font-awesome-layers", FontAwesomeLayers);
// Vue.component("font-awesome-layers-text", FontAwesomeLayersText);
//
// import {
//   faAngleDown,
//   faAngleLeft,
//   faArrowUp,
//   faArrowDown,
//   faCheckSquare,
//   faCog,
//   faEnvelope,
//   faEye,
//   faFlask,
//   faList,
//   faListAlt,
//   faListOl,
//   faFilter,
//   faSignOutAlt,
//   faTrashAlt,
//   faUsers,
// } from "@fortawesome/free-solid-svg-icons";
//
// library.add(
//   faAngleDown,
//   faAngleLeft,
//   faArrowUp,
//   faArrowDown,
//   faCheckSquare,
//   faCog,
//   faEnvelope,
//   faEye,
//   faFlask,
//   faList,
//   faListAlt,
//   faListOl,
//   faFilter,
//   faSignOutAlt,
//   faTrashAlt,
//   faUsers,
// );
//
// import { faClock, faClone } from "@fortawesome/free-regular-svg-icons";
//
// library.add(faClock, faClone);

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
