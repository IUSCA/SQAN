<template>
      <v-container
        class="fill-height"
        fluid
      >
        <v-row
          align="center"
          justify="center"
        >
          <v-col
            cols="12"
            sm="8"
            md="4"
          >
            <v-card class="elevation-12">
              <v-toolbar
                color="primary"
                dark
                flat
              >
                <v-toolbar-title>Login form</v-toolbar-title>
                <v-spacer />
              </v-toolbar>
              <v-card-text>
                <v-form>
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
                </v-form>
              </v-card-text>
              <v-card-actions>
                <v-spacer />
                <v-btn color="primary" @click="userLogin">Login</v-btn>
              </v-card-actions>
            </v-card>
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
      }
    };
  },
  methods: {
    ...mapActions(["login"]),

    userLogin: function() {
      let self = this;
      this.$http.post(`${this.$config.api}/userLogin`, { user: self.form }).then(
        function(res) {
          console.log(res.data);
          self.login(res.data);
          setTimeout(() => {
            self.$notify({
              group: "main",
              title: "Signin successful",
              type: "success",
              text: "Logging you in"
            });
            self.$store.commit('SET_LAYOUT', 'app-layout')
            self.$router.push({ path: "/exams" });
          }, 300);
        },
        function(err) {
          self.$notify({
            group: "main",
            title: "Signin Failed",
            type: "error",
            text: err
          });
        }
      );
    }
  }
};
</script>

<style>
body {
  /*TODO Let background image customizable? */
  background-color: #484f56;
}

.login-form {
  width: 340px;
  margin: 50px auto;
}
.login-form form {
  margin-bottom: 15px;
  background: #f7f7f7;
  box-shadow: 0px 2px 2px rgba(0, 0, 0, 0.3);
  padding: 30px;
}
.login-form h2 {
  margin: 0 0 15px;
}
.form-control,
.btn {
  min-height: 38px;
  border-radius: 2px;
}
.btn {
  font-size: 15px;
  font-weight: bold;
}

.center-parent {
  position: relative;
  width: 100%;
  min-height: 100vh;
}
.center-child {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
</style>
