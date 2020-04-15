<template>
  <v-card>
    <v-card-title>
      <v-icon>mdi-account</v-icon>
      New / Edit User
    </v-card-title>

    <form class="form-horizontal" name="user_form">
      <fieldset>
        <div class="form-group">
          <label for="inputUsername" class="col-lg-2 control-label"
            >Username</label
          >
          <div class="col-lg-10">
            <input
              type="text"
              class="form-control"
              id="inputUsername"
              placeholder="Username"
              autocomplete="off"
              v-model="userdata.username"
            />
          </div>
        </div>
        <div class="form-group">
          <label for="inputFullname" class="col-lg-2 control-label">Name</label>
          <div class="col-lg-10">
            <input
              type="text"
              class="form-control"
              id="inputFullname"
              placeholder="Full name"
              autocomplete="off"
              v-model="userdata.fullname"
            />
          </div>
        </div>
        <div class="form-group">
          <label for="inputEmail" class="col-lg-2 control-label">Email</label>
          <div class="col-lg-10">
            <input
              type="text"
              class="form-control"
              id="inputEmail"
              placeholder="Email"
              autocomplete="off"
              v-model="userdata.email"
            />
          </div>
        </div>
        <div class="form-group">
          <label for="inputRoles" class="col-lg-2 control-label">Roles</label>
          <div class="col-lg-10">
            <v-select
              multiple
              v-model="userdata"
              required
              :item="userdata.roles"
            >
            </v-select>
          </div>
        </div>

        <div class="form-group">
          <label for="inputPrimary" class="col-lg-2 control-label"
            >Primary Role</label
          >
          <div class="col-lg-10">
            <v-select
              class="form-control"
              id="select"
              v-model="userdata.primary_role"
            >
              <option v-for="role in userdata.roles" :key="role">{{
                role
              }}</option>
            </v-select>
            <span class="help-block"
              >Add roles to user to add primary role options</span
            >
          </div>
        </div>
        <div class="form-group">
          <div class="col-lg-10 col-lg-offset-2">
            <v-btn type="reset" class="btn btn-default" @click="hideuserform()">
              Cancel
            </v-btn>
            <v-btn
              type="submit"
              class="btn btn-primary"
              @click="
                submituserdata();
                event.preventDefault();
              "
            >
              Submit
            </v-btn>
          </div>
        </div>
      </fieldset>
    </form>
  </v-card>
</template>

<script>
export default {
  props: ["userdata"],

  data() {
    return {};
  },
  hideuserdata() {
    this.userdata = "";
  },
  submituserdata() {
    this.$emit("close");
    // $scope.show_userform = false;
    // $scope.active_tab = 0;
    if (this.userdata._id !== undefined) {
      //toaster.success("Updating user!");
      console.log("updating user");
      this.$http
        .patch(`${this.$config.api}/user/` + this.userdata._id, this.userdata)
        .then(function(res) {
          console.log(res.data);
          //toaster.success("User updated!");
        }, this.toast_error);
    } else {
      //toaster.success("Creating new user!");
      this.$http
        .post(`${this.$config.api}/user`, this.userdata)
        .then(function(res) {
          console.log(res.data);
          //toaster.success("New user created, refreshing user list");
          //this.refreshUsers();
        }, this.toast_error);
    }
  },
  mounted() {
    console.log("User form has been created!");
    console.log(this.userdata);
  }
};
</script>
