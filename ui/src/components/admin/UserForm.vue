<template>
  <v-dialog v-model="show_userform">
    <template v-slot:activator="{ on }">
      <span v-on="on">
        <slot name="label">
          <v-btn color="green lighten-2" dark class="ma-2">
            <v-icon>mdi-account-plus</v-icon>
            Create User
          </v-btn>
        </slot>
      </span>
    </template>

    <v-card>
      <v-card-title>
        <v-icon>mdi-account</v-icon>
        New / Edit User
      </v-card-title>

      <form
        v-on:submit.prevent="submituserdata"
        class="form-horizontal"
        name="user_form"
      >
        <fieldset>
          <div class="form-group">
            <label for="inputUsername" class="col-lg-2 control-label">
              Username
            </label>
            <div class="col-lg-10">
              <v-text-field
                class="form-control"
                id="inputUsername"
                placeholder="Username"
                autocomplete="off"
                v-model="userdataLocal.username"
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
                v-model="userdataLocal.fullname"
              />
            </div>
          </div>
          <div class="form-group">
            <label for="inputEmail" class="col-lg-2 control-label">Email</label>
            <div class="col-lg-10">
              <v-text-field
                class="form-control"
                id="inputEmail"
                placeholder="Email"
                autocomplete="off"
                v-model="userdataLocal.email"
              />
            </div>
          </div>
          <div class="form-group">
            <label for="inputRoles" class="col-lg-2 control-label">Roles</label>
            <div class="col-lg-10">
              <v-select
                multiple
                v-model="userdataLocal.roles"
                required
                :items="user_roles"
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
                v-model="userdataLocal.primary_role"
                :items="userdataLocal.roles"
              >
              </v-select>
              <span class="help-block">
                Add roles to user to add primary role options
              </span>
            </div>
          </div>
          <div class="form-group">
            <div class="col-lg-10 col-lg-offset-2">
              <v-btn type="reset" class="btn btn-default" @click="closeForm()">
                Cancel
              </v-btn>
              <v-btn
                type="submit"
                class="btn btn-primary"
                @click="submituserdata()"
              >
                Submit
              </v-btn>
            </div>
          </div>
        </fieldset>
      </form>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  props: {
    userdata: {
      type: Object,
      // be sure to specify a default in case a value is not provided
      default: () => ({
        username: "",
        fullname: "",
        email: "",
        roles: [],
        primary_role: ""
      })
    }
  },

  data() {
    return {
      show_userform: false,
      userdataLocal: { ...this.userdata },
      user_roles: ["user", "guest", "admin", "technologist", "researcher"]
    };
  },
  methods: {
    submituserdata() {
      // this.$emit("close");
      // $scope.show_userform = false;
      // $scope.active_tab = 0;
      console.log(this.userdataLocal);
      if (this.userdataLocal._id !== undefined) {
        //toaster.success("Updating user!");
        console.log("updating user");
        this.$http
          .patch(
            `${this.$config.api}/user/` + this.userdataLocal._id,
            this.userdataLocal
          )
          .then(function(res) {
            console.log(res.data);
            //toaster.success("User updated!");
          }, this.toast_error);
      } else {
        //toaster.success("Creating new user!");
        console.log("creating user");
        this.$http
          .post(`${this.$config.api}/user`, this.userdataLocal)
          .then(function(res) {
            console.log(res.data);
            //toaster.success("New user created, refreshing user list");
            //this.refreshUsers();

            //$emit('refresh', true)
          }, this.toast_error);
      }
      this.$emit("refresh");
      this.show_userform = false;
    },
    closeForm: function() {
      this.show_userform = false;
    },
    createUser: function() {
      this.show_userform = true;
      console.log("createUser called");
    },
    editUser: function(user) {
      this.current_user = user;
      this.show_userform = true;
      console.log("editUser called");
    }
  },
  mounted() {
    console.log("User form has been created!");
    console.log(this.userdataLocal);
  }
};
</script>

<style scoped>
i {
  padding-right: 10px;
}
</style>
