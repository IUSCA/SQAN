import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

export default new Vuex.Store({
    state: {
        auth: {
            uid: localStorage.getItem('uid') || '',
            role: localStorage.getItem('role') || 'guest',
            jwt: localStorage.getItem('jwt') || '',
            jwt_exp: localStorage.getItem('jwt_exp') || ''
        }
    },
    mutations: {
        authChange (state, auth) {
            state.auth = auth
        },
    },
    actions: {
        login({commit}, auth) {
            commit('authChange', auth);
            localStorage.setItem('uid', auth.uid);
            localStorage.setItem('role', auth.role);
            localStorage.setItem('jwt', auth.jwt);
            localStorage.setItem('jwt_exp', auth.jwt_exp);
        },
        logout({commit}) {
            localStorage.setItem('uid', '');
            localStorage.setItem('role', '');
            localStorage.setItem('roles', '');
            localStorage.setItem('jwt', '');
            localStorage.setItem('jwt_exp', '');
            commit('authChange', {
                uid: '',
                role: 'guest',
                jwt: '',
                ldapinfo: {}
            });
        },
    },
    modules: {}
})
