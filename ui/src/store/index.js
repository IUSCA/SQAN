import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex);

export default new Vuex.Store({
    state: {
        auth: {
            uid: localStorage.getItem('uid') || '',
            role: localStorage.getItem('role') || 'guest',
            roles: JSON.parse(localStorage.getItem('roles') || '[]'),
            jwt: localStorage.getItem('jwt') || '',
            jwt_exp: localStorage.getItem('jwt_exp') || ''
        },
        layout: 'simple-layout',
        snack: '',
        isError: false,
        timeout: 3000

    },
    mutations: {
        authChange (state, auth) {
            state.auth = auth
        },
        SET_LAYOUT (state, payload) {
          state.layout = payload
        },
        setSnack (state, snack) {
          console.log(snack);
          if(typeof snack == 'string') {
            state.snack = snack
          } else {
            state.snack = snack.msg
            state.isError = snack.isError
            state.timeout = snack.timeout
          }
        }
    },
    actions: {
        login({commit}, auth) {
            commit('authChange', auth);
            localStorage.setItem('uid', auth.uid);
            localStorage.setItem('role', auth.role);
            localStorage.setItem('roles', JSON.stringify(auth.roles));
            localStorage.setItem('jwt', auth.jwt);
            localStorage.setItem('jwt_exp', auth.jwt_exp);
        },
        logout({commit}) {
            localStorage.setItem('uid', '');
            localStorage.setItem('role', '');
            localStorage.setItem('roles', '[]');
            localStorage.setItem('jwt', '');
            localStorage.setItem('jwt_exp', '');
            commit('authChange', {
                uid: '',
                role: 'guest',
                roles: ['guest'],
                jwt: '',
            });
        },
        snack({commit}, snack) {
          commit('setSnack', snack);
        }
    },
    getters: {
      layout (state) {
        return state.layout
      },
      isAdmin (state) {
        return state.auth.roles.includes('admin');
      },
      hasRole: (state) => (r) => {
        return state.auth.roles.includes(r);
      }
    },
    modules: {}
})
