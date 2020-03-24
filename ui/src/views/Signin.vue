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
            md="6"
          >
            <v-img src="../assets/sqan_logo_full.png" class="elevation-4" />
            <v-divider class="mb-2 mt-2"></v-divider>
            <v-form @submit.prevent="userLogin">
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

</style>
