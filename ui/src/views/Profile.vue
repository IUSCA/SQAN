<template>
  <div class="container">
    <div class="row">
      <div class="col-sm-12">

        <v-card class="pa-4 elevation-6">
          <form
            class="form-horizontal"
            name="user_form"
            v-on:submit.prevent="updateUser"
          >
            <v-row>
              <v-col cols="3" class="text-center">
                <v-gravatar :email="user.email" :size="160" class="elevation-6" />
                <br />
                <p class="caption">
                  Your avatar is handled by
                  <a target="_blank" href="http://gravatar.com"
                  >gravatar.com</a
                  >
                  using your account email address.
                </p>

              </v-col>
              <v-col cols="1">
                <v-divider
                  class="ml-1"
                  vertical
                ></v-divider>
              </v-col>
              <v-col cols="8">
                <v-text-field
                  class="form-control"
                  id="inputUsername"
                  placeholder="Username"
                  autocomplete="off"
                  v-model="user.username"
                  label="Username"
                  disabled
                />


                <v-text-field
                  class="form-control"
                  id="inputFullname"
                  placeholder="Full name"
                  autocomplete="off"
                  label="Fullname"
                  v-model="user.fullname"
                />

                <v-text-field
                  class="form-control"
                  id="inputEmail"
                  placeholder="Email"
                  autocomplete="off"
                  v-model="user.email"
                  label="Email"
                />

                <v-label class="v-label--active" active for="userRoles" style="transform(0.75);">
                  Roles
                </v-label>
                <div id="userRoles">
                  <v-chip  v-for="r in user.roles" :key="r">{{r}}</v-chip>
                </div>

                <v-select
                  class="mt-3"
                  outlined
                  :items="user.roles"
                  id="inputPrimary"
                  label="Primary Role"
                  v-model="user.primary_role"
                >
                </v-select>

                <v-label for="groups" class="col-lg-2 control-label" style="transform(0.75);"
                >Member Of</v-label
                >
                <div id="groups">
                  <v-chip class="mb-2" v-for="g in user_groups" :key="g._id">{{g.name}}</v-chip><br>
                </div>

              </v-col>
            </v-row>




              <v-btn type="submit" color="success" class="float-right mb-2">
                Update
              </v-btn>
                <v-divider />
                <span class="body-2 font-weight-light"
                  >Your username, roles, and group membership can only be
                  updated by site administrators.
                  <a href="mailto:sca-group@iu.edu">Contact us</a> if one of
                  these items needs to be updated.
                </span>


          </form>
        </v-card>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "profile",
  data() {
    return {
      user: {},
      user_groups: []
    };
  },
  methods: {
    query: function() {
      this.$http.get(`${this.$config.api}/user/self`).then(
        res => {
          this.user = res.data.user;
          this.user_groups = res.data.groups;
          console.log("current user retrieved from db");
          console.log(res.data);
        },
        err => {
          console.log("Error contacting API");
          console.dir(err);
        }
      );
    },
    updateUser: function() {
      console.log("updating user");
      this.$http
        .patch(`${this.$config.api}/user/` + this.user._id, this.user)
        .then(res => {
          this.$store.dispatch('snack', "Profile updated successfully");
          console.log(res.data);
        });
    }
  },
  mounted() {
    // console.log("Component has been created!");
    this.query();
  }
};
</script>
