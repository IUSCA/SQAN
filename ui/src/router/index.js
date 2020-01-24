import Vue from 'vue'
import VueRouter from 'vue-router'
import Signin from '../views/Signin.vue'

Vue.use(VueRouter)

const router = new VueRouter({
    mode: 'history',
    routes: [
        {
            path: '/',
            name: 'signin',
            component: Signin
        },
        {
            path: '/exams',
            name: 'exams',
            meta: {
                requiresAuth: true,
                is_admin: true
            },
            component: () => import(/* webpackChunkName: "exams" */ '../views/Exams.vue')
        }
    ]
});


router.beforeEach((to, from, next) => {
    if (to.matched.some(record => record.meta.requiresAuth)) {
        let role = localStorage.getItem('role');
        let jwt_exp = localStorage.getItem('jwt_exp') || (Date.now()) / 1000;
        let now = (Date.now()) / 1000 + 600;

        console.log("In router, role is set to", role);
        console.log("In router, jwt_exp is set to", jwt_exp);
        console.log("In router, jwt expiration is ", (now > jwt_exp));
        if (typeof (role) === 'undefined' || role === 'undefined' || role === 'guest' || !role || now > jwt_exp) {
            next({
                path: '/'
            })
        } else {
            if (to.matched.some(record => record.meta.is_admin)) {
                if (role === 'admin') {
                    next()
                } else {
                    next({name: 'signin'})
                }
            } else {
                next()
            }
        }
    } else {
        next()
    }
})

export default router
