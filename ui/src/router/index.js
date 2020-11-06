import Vue from 'vue'
import VueRouter from 'vue-router'
import Signin from '../views/Signin.vue'
import About from '../views/About.vue'
import QCKeys from '../views/QCKeys.vue'
import Dataflow from '../views/Dataflow'
import TemplateSummary from '../views/TemplateSummary.vue'
import ResearchSummary from '../views/ResearchSummary.vue'
import Admin from '../views/Admin.vue'
import Profile from '../views/Profile.vue'
import Signout from '../views/Signout.vue'
import Report from "../views/Report";
import Upload from "../views/Upload";

import store from '../store';

Vue.use(VueRouter);

const router = new VueRouter({
  mode: 'history',
  routes: [
    {
      path: '/signin',
      name: 'signin',
      component: Signin,
      meta: {
        simple_layout: true
      }
    },
    {
      path: '/about',
      name: 'about',
      component: About
    },
    {
      path: '/exams',
      name: 'exams',
      alias: '/',
      meta: {
        requiresAuth: true,
        is_admin: false
      },
      component: () => import(/* webpackChunkName: "exams" */ '../views/Exams.vue')
    },
    {
      path: '/templatesummary',
      name: 'templatesummary',
      component: TemplateSummary,
      meta: {
        requiresAuth: true,
        is_admin: false
      },
    },
    {
      path: '/researchsummary',
      name: 'researchsummary',
      component: ResearchSummary,
      meta: {
        requiresAuth: true,
        is_admin: false
      },
    },
    {
      path: '/admin',
      name: 'admin',
      component: Admin,
      meta: {
        requiresAuth: true,
        is_admin: true
      },
    },
    {
      path: '/dataflow',
      name: 'dataflow',
      component: Dataflow,
      meta: {
        requiresAuth: true,
        is_admin: true
      },
    },
    {
      path: '/qckeys',
      name: 'qckeys',
      component: QCKeys,
      meta: {
        requiresAuth: true,
        is_admin: true
      },
    },
    {
      path: '/upload',
      name: 'upload',
      component: Upload,
      meta: {
        requiresAuth: true,
        is_admin: true
      },
    },
    {
      path: '/report',
      name: 'report',
      component: Report,
      meta: {
        requiresAuth: true,
      },
    },
    {
      path: '/profile',
      name: 'profile',
      component: Profile,
      meta: {
        requiresAuth: true,
        is_admin: false
      },
    },
    {
      path: '/signout',
      name: 'signout',
      component: Signout,
      meta: {
        requiresAuth: true,
        is_admin: false,
        simple_layout: true
      },
    },


  ]
});


router.beforeEach((to, from, next) => {
  if (to.matched.some(record => record.meta.simple_layout)) {
    store.commit('SET_LAYOUT', 'simple-layout');
  } else {
    store.commit('SET_LAYOUT', 'app-layout');
  }

  if (to.matched.some(record => record.meta.requiresAuth)) {
    let role = localStorage.getItem('role');
    let jwt_exp = localStorage.getItem('jwt_exp') || (Date.now()) / 1000;
    let now = (Date.now()) / 1000 + 600;


    console.log("In router, role is set to", role);
    console.log("In router, jwt_exp is set to", jwt_exp);
    console.log("In router, jwt expiration is ", (now > jwt_exp));
    if(now > jwt_exp) {
      return next({
        path: '/signin',

      })
    }
    if (typeof (role) === 'undefined' || role === 'undefined' || !role ) {
      return next({
        path: '/signin',

      })
    } else {
      if (to.matched.some(record => record.meta.is_admin)) {
        if (store.getters.hasRole('admin')) {
          return next()
        } else {
          return next(false)
        }
      } else {
        return next()
      }
    }
  } else {
    return next()
  }
});

export default router
