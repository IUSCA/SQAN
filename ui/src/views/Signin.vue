<template>
      <v-container
        class="fill-height"
        id="signin"
        fluid
      >
        <v-snackbar
          v-model="snackbar"
          top
          right
          :timeout="timeout"
        >
          {{status}}
          <v-btn
            color="red"
            text
            @click="snackbar = false"
          >
            Close
          </v-btn>
        </v-snackbar>

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
            <v-divider class="my-2"></v-divider>
            <v-btn block @click="showForm = true" v-show="!showForm" class="elevation-8" color="primary"><v-icon class="mx-1">mdi-account</v-icon> Local Signin</v-btn>

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
      status: '',
      snackbar: false,
    };
  },
  computed: {
    casticket: function () {
      return this.$route.query.casticket;
    },
    redirect: function() {
      return this.$route.query.redirect;
    }
  },
  methods: {
    ...mapActions(["login"]),

    begin_iucas: function() {
      window.location = this.$config.iucas_url+'?cassvc=IU&casurl='+this.$config.cas_return;
    },

    validate: function(casticket) {
      var self = this;
      this.$http.get(this.$config.api + '/verify?casticket=' + casticket)
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

    completeLogin: function(response) {
      let self = this;
      this.login(response);
      self.snackbar = false;
      self.status = "Logging you in";
      self.snackbar = true;
      setTimeout(() => {
        self.$store.commit('SET_LAYOUT', 'app-layout');
        self.$router.push({ path: "/exams" });
      }, 300);
    },

    errorLogin: function(err) {
      self.snackbar = false;
      self.status = err;
      self.snackbar = true;
    }
  },
  mounted() {
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
