<template>
  <v-dialog v-model="show_userform" max-width="750">
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

    <v-form ref="userform">

    <v-card>
      <v-card-title>
        <v-icon>mdi-account-edit</v-icon>
        New / Edit User
      </v-card-title>

      <v-card-text>

        <v-text-field
          class="form-control"
          id="inputUsername"
          placeholder="Username"
          label="Username"
          autocomplete="off"
          v-model="userdataLocal.username"
        />

        <v-text-field
          class="form-control"
          id="inputFullname"
          placeholder="Full name"
          autocomplete="off"
          label="Fullname"
          v-model="userdataLocal.fullname"
        />

        <v-text-field
          class="form-control"
          id="inputEmail"
          label="Email"
          placeholder="Email"
          autocomplete="off"
          v-model="userdataLocal.email"
        />

        <v-autocomplete
          multiple
          chips
          small-chips
          outlined
          v-model="userdataLocal.roles"
          label="Roles"
          required
          :items="user_roles"
        >
        </v-autocomplete>


        <v-select
          class="form-control"
          id="select"
          label="Primary Role"
          v-model="userdataLocal.primary_role"
          :items="userdataLocal.roles"
          description="Add roles to user to enable primary role options"
        >
        </v-select>

      </v-card-text>

      <v-spacer></v-spacer>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          color="green white--text"
          @click="submituserdata"
        >
          Submit
        </v-btn>
      </v-card-actions>

    </v-card>
    </v-form>
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
      user_roles: ["user", "guest", "admin", "technologist", "researcher", "god"]
    };
  },
  watch: {
    userdata: function(val) {
      this.userdataLocal = { ...val };
    }
  },
  methods: {
    submituserdata() {

      console.log(this.userdataLocal);


      let method = '';
      let url =  '';
      let message = ';'
      if(this.userdataLocal._id === undefined) {
        message = 'Created new user';
        method = 'post';
        url = `${this.$config.api}/user`;
      } else {
        message = `Updated ${this.userdata.fullname} successfully`;
        method = 'patch';
        url = `${this.$config.api}/user/${this.userdataLocal._id}`;
      }

      let self = this;
      this.$http({method: method, url: url, data: this.userdataLocal})
        .then(res => {
          console.log(res.data);
          self.$emit('refresh');
          self.$store.dispatch('snack', message);
          self.closeForm();
        }, err => {
          self.$store.dispatch('snack', err);
          console.log(err);
        })
      // if (this.userdataLocal._id !== undefined) {
      //
      //   console.log("updating user");
      //   this.$http
      //     .patch(
      //       `${this.$config.api}/user/` + this.userdataLocal._id,
      //       this.userdataLocal
      //     )
      //     .then(function(res) {
      //       console.log(res.data);
      //       this.$emit('submitted')
      //
      //     }, err => {
      //       console.log(err);
      //     });
      // } else {
      //   console.log("creating user");
      //   this.$http
      //     .post(`${this.$config.api}/user`, this.userdataLocal)
      //     .then(function(res) {
      //       console.log(res.data);
      //       this.$emit('submitted')
      //
      //     }, this.toast_error);
      // }
      this.$emit("refresh");
      this.show_userform = false;
    },
    closeForm: function() {
      this.show_userform = false;
    },
  },
  mounted() {

  }
};
</script>

<style scoped>
i {
  padding-right: 10px;
}
</style>
