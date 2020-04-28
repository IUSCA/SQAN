<template>
  <div class="container">
    <div class="row">
      <div class="col-sm-12">
        <h3><i class="fa fa-cog"></i> Profile and Settings</h3>

        <v-card>
          <form
            class="form-horizontal"
            name="user_form"
            v-on:submit.prevent="updateUser"
          >
            <fieldset>
              <div class="well">
                <div class="form-group">
                  <label for="inputUsername" class="col-lg-2 control-label"
                    >Username</label
                  >
                  <div class="col-lg-10">
                    <v-text-field
                      class="form-control"
                      id="inputUsername"
                      placeholder="Username"
                      autocomplete="off"
                      v-model="user.username"
                      disabled
                    />
                  </div>
                </div>
                <div class="form-group">
                  <label for="inputFullname" class="col-lg-2 control-label"
                    >Name</label
                  >
                  <div class="col-lg-10">
                    <v-text-field
                      class="form-control"
                      id="inputFullname"
                      placeholder="Full name"
                      autocomplete="off"
                      v-model="user.fullname"
                    />
                  </div>
                </div>
                <div class="form-group">
                  <label for="inputEmail" class="col-lg-2 control-label"
                    >Email</label
                  >
                  <div class="col-lg-10">
                    <v-text-field
                      class="form-control"
                      id="inputEmail"
                      placeholder="Email"
                      autocomplete="off"
                      v-model="user.email"
                    />
                  </div>
                </div>
                <div class="form-group">
                  <label class="col-lg-2 control-label">Roles</label>
                  <div class="col-lg-10">
                    <ul id="roles">
                      <li v-for="role in user.roles" v-bind:key="role">
                        {{ role }}
                      </li>
                    </ul>
                  </div>
                </div>

                <div class="form-group">
                  <label for="inputPrimary" class="col-lg-2 control-label"
                    >Primary Role</label
                  >
                  <div class="col-lg-10">
                    <select
                      class="form-control"
                      id="inputPrimary"
                      v-model="user.primary_role"
                    >
                      <option v-for="role in user.roles" v-bind:key="role">{{
                        role
                      }}</option>
                    </select>
                  </div>
                </div>

                <div class="form-group">
                  <label for="groups" class="col-lg-2 control-label"
                    >Member Of</label
                  >
                  <div class="col-lg-10">
                    <ul id="groups">
                      <li v-for="g in user_groups" v-bind:key="g">
                        {{ groups_o[g].name }}
                      </li>
                    </ul>
                  </div>
                </div>

                <div class="form-group">
                  <label for="gravatar" class="col-lg-2 control-label"
                    >Gravatar</label
                  >
                  <div class="col-lg-10">
                    <img
                      id="gravatar"
                      gravatar-src="user.email"
                      gravatar-size="90"
                      align="left"
                      style="padding-right: 20px;"
                    />
                    <br />
                    <p>
                      Your avatar is handled by
                      <a target="_blank" href="http://gravatar.com"
                        >gravatar.com</a
                      >
                      using your account email address.
                    </p>
                    <span class="text-muted">{{ user.email }}</span>
                  </div>
                </div>
                <hr />
                <span class="help-block"
                  >Your username, roles, and group membership can only be
                  updated by site administrators.
                  <a href="mailto:sca-group@iu.edu">Contact us</a> if one of
                  these items needs to be updated.
                </span>
              </div>
              <div class="form-group">
                <div class="col-lg-10 col-lg-offset-2">
                  <v-btn type="submit" class="btn btn-primary">
                    Update
                  </v-btn>
                </div>
              </div>
            </fieldset>
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
          this.groups = res.data.groups;
          console.log("current user retrieved from db");
          console.log(this.user);
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
