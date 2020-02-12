import Vue from "vue";
import App from "./App.vue";
import router from "./router";
import store from "./store";

Vue.config.productionTip = false;

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

//Bootstrap
import { BootstrapVue, BootstrapVueIcons } from "bootstrap-vue";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-vue/dist/bootstrap-vue.css";
import "bootswatch/dist/yeti/bootstrap.min.css";

Vue.use(BootstrapVue);
Vue.use(BootstrapVueIcons);

//FontAwesome
import { library } from "@fortawesome/fontawesome-svg-core";

import {
  FontAwesomeIcon,
  FontAwesomeLayers,
  FontAwesomeLayersText
} from "@fortawesome/vue-fontawesome";

Vue.component("font-awesome-icon", FontAwesomeIcon);
Vue.component("font-awesome-layers", FontAwesomeLayers);
Vue.component("font-awesome-layers-text", FontAwesomeLayersText);

import {
  faSignOutAlt,
  faEnvelope,
  faCog,
  faUsers,
  faFlask,
  faCheckSquare,
  faListAlt
} from "@fortawesome/free-solid-svg-icons";

library.add(
  faSignOutAlt,
  faEnvelope,
  faCog,
  faUsers,
  faFlask,
  faCheckSquare,
  faListAlt
);

import { faClone } from "@fortawesome/free-regular-svg-icons";

library.add(faClone);

//Notifications
import Notifications from "vue-notification";

Vue.use(Notifications);

//Filters
import "./filters.js";

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount("#app");
