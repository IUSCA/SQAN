<template>
      <v-container
        class="fill-height"
        id="signin"
        fluid
      >

        <v-row
          align="center"
          justify="center"
        >
          <v-col
            cols="12"
            sm="8"
            md="6"
          >
            <v-img src="../assets/sqan_logo_full.png" class="elevation-4" />
            <v-divider class="mb-2 mt-2"></v-divider>
            <v-btn block @click="begin_iucas" class="elevation-8" color="primary"><v-img src="../assets/trident.png" max-width="15px" class="mx-1"/> Login with IU CAS</v-btn>
            <v-divider class="mb-2 mt-2" v-show="mode === 'demo'"></v-divider>
            <v-btn block @click="guestLogin" class="elevation-8" color="primary" v-show="mode === 'demo'"><v-icon class="mx-1">mdi-account-outline</v-icon> Guest Login</v-btn>
            <v-divider class="my-2" v-show="mode !== 'production'"></v-divider>
            <v-btn block @click="showForm = true" v-show="!showForm && mode !== 'production'" class="elevation-8" color="primary"><v-icon class="mx-1">mdi-account</v-icon> User Login</v-btn>

            <v-form @submit.prevent="userLogin" v-show="showForm">
            <v-card class="elevation-12">
              <v-card-text>
                  <v-text-field
                    label="Login"
                    name="login"
                    v-model="form.username"
                    prepend-icon="mdi-account"
                    type="text"
                  />

                  <v-text-field
                    id="password"
                    label="Password"
                    name="password"
                    v-model="form.password"
                    prepend-icon="mdi-lock"
                    type="password"
                  />
              </v-card-text>
              <v-card-actions>
                <v-spacer />
                <v-btn type="submit" color="primary" @click="userLogin">Login</v-btn>
              </v-card-actions>
            </v-card>
            </v-form>
          </v-col>
        </v-row>
      </v-container>
</template>

<script>
import { mapActions } from "vuex";

export default {
  name: "signin",
  data() {
    return {
      form: {
        username: "",
        password: ""
      },
      showForm: false,
      mode: this.$config.mode
    };
  },
  computed: {
    casticket: function () {
      return this.$route.query.ticket;
    },
    redirect: function() {
      return this.$route.query.redirect;
    }
  },
  methods: {
    ...mapActions(["login"]),

    begin_iucas: function() {
      window.location = this.$config.iucas_url+'?service='+this.$config.cas_return;
    },

    // begin_iucas: function() {
    //   window.location = this.$config.iucas_url+'?cassvc=IU&casurl='+this.$config.cas_return;
    // },

    validate: function(casticket) {
      console.log(`Calling validate`);
      var self = this;
      this.$http.get(this.$config.api + '/verify?casticket=' + casticket+ '&service='+this.$config.cas_return)
        .then(res => {
          console.log(res.data);
          self.completeLogin(res.data);
        },
          err => {
            self.errorLogin(err);
          }
      )
    },

    userLogin: function() {
      let self = this;
      this.$http.post(`${this.$config.api}/userLogin`, { user: self.form }).then(
        function(res) {
          self.completeLogin(res.data);
        },
        self.errorLogin
      );
    },

    guestLogin: function() {
      let self = this;
      this.$http.get(`${this.$config.api}/guestLogin`).then(
        function(res) {
          self.completeLogin(res.data);
        },
        self.errorLogin
      );
    },

    completeLogin: function(response) {
      let self = this;
      this.login(response);
      self.$store.dispatch('snack', "Login successful");
      console.log(self.$store.state.auth.jwt_exp);
      setTimeout(() => {
        self.$router.replace({'query': null});
        self.$router.push({path: '/exams'});
      }, 300);
    },

    errorLogin: function(err) {

      let status = err.response.status;
      if(status == 403) {
        this.$store.dispatch('snack', {
          msg: `Login failed: validation error`,
          isError: true,
          timeout: 5000
        });
      }

      if(status == 401) {
        this.$store.dispatch('snack', {
          msg: `Login failed: unknown user`,
          isError: true,
          timeout: 5000
      });
      }

      // let errors = err.response.data.errors;
      // let key = Object.keys(errors)[0];
      // this.$store.dispatch('snack', `${key} ${errors[key]}`);
    }
  },
  mounted() {
      console.log(this.mode);
    if(this.redirect) {
      console.log("redirect is set, redirect is set to: ",this.redirect);
      localStorage.setItem('redirect', this.redirect);
    }

    if(this.casticket) {
      this.validate(this.casticket)
    }
  }
};
</script>

<style>

  #signin {
    background-color: #5cadde;
    height: 100vh;
    background-position: center;
    background-repeat: no-repeat;
    background-size: cover;
    position: relative;
  }

</style>
