<template>
  <div class="UserList">
    <UserForm @refresh="query" v-bind:userdata="current_user"></UserForm>

    <v-data-table
      :items="users"
      :headers="headers"
      :search="search"
      class="elevation-4"
      item-key="name"
    >
      <template v-slot:item.roles="{ item }">
        {{ item.roles.join(" | ") }}
      </template>
      <template v-slot:item.createDate="{ item }">
        {{ item.createDate | date }}
      </template>
      <template v-slot:item.lastLogin="{ item }">
        {{ item.lastLogin | date }}
      </template>

      <template v-slot:item.actions="{ item }">
        <v-icon small class="mr-2" @click="sudoUser(item)">
          mdi-account-convert
        </v-icon>
        <UserForm @refresh="query" v-bind:userdata="item">
          <template v-slot:label>
            <v-icon small class="mr-2">
              mdi-pencil
            </v-icon>
          </template>
        </UserForm>

        <Confirm
          title="Delete User?"
          :message="deleteMessage(item)"
          color="red lighten-2"
          v-on:confirm="deleteUser(item)"
        >
          <template v-slot:label>
            <v-icon small>
              mdi-delete
            </v-icon>
          </template>
        </Confirm>
      </template>
    </v-data-table>
    <hr />
  </div>
</template>

<script>
import UserForm from "@/components/admin/UserForm.vue";
import Confirm from "@/components/Confirm.vue";

export default {
  // TODO:
  // make sure users are sorted by 'primary_role':
  //             v-for="user in users | orderBy: 'primary_role'">
  components: { UserForm, Confirm },
  data() {
    return {
      users: [],
      current_user: {},
      search: "",

      headers: [
        {
          text: "Name",
          value: "fullname",
          sortable: true
        },
        {
          text: "Email",
          value: "email",
          sortable: true
        },
        {
          text: "Primary Role",
          value: "primary_role",
          sortable: true
        },
        {
          text: "Roles",
          value: "roles",
          sortable: true
        },
        {
          text: "Created",
          value: "createDate",
          sortable: true
        },
        {
          text: "Last Login",
          value: "lastLogin",
          sortable: true
        },
        { text: "Actions", value: "actions", sortable: false }
      ]
    };
  },

  methods: {
    query: function() {
      this.$http.get(`${this.$config.api}/user/all`).then(
        res => {
          this.users = res.data;
          console.log(this.results.length + " users retrieved from db");
          console.log(this.results);
        },
        err => {
          console.log("Error contacting API");
          console.dir(err);
        }
      );
    },
    userIcon: function(user) {
      if (user.primary_role == "user" || user.primary_role == "guest") {
        return "fa-user-circle";
      } else if (user.primary_role == "admin") {
        return "fa-lock";
      } else if (user.primary_role == "researcher") {
        return "fa-flask";
      } else if (user.primary_role == "technlogist") {
        return "fa-cogs";
      }
    },
    userClass: function(user) {
      if (user.primary_role == "admin") {
        return "text-danger";
      } else if (user.primary_role == "researcher") {
        return "text-info";
      } else if (user.primary_role == "technlogist") {
        return "text-success";
      }
    },
    deleteMessage: function(user) {
      return `Are you sure you want to delete ${user.fullname}?`;
    },

    deleteUser: function(user) {
      console.log("deleteUser called");
      // var alert = `Please confirm that you want to delete user ${user.username}`;

      // var r = confirm(alert);
      // if (r == true) {
      // console.log("delete confirmed");
      this.$http.delete(`${this.$config.api}/user/` + user._id).then(
        res => {
          console.log("Delete successful", res);
          //toaster.success(
          //  `Successfully deleted ${user.username}, refreshing user list`
          //);
          this.query();
        },
        err => {
          console.log("Delete failed", err);
          //toaster.error(err.statusText);
        }
      );
      // } else {
      //   console.log("delete canceled");
      // }
    },
    sudoUser: function() {
      console.log("sudoUser called");
    }
  },
  mounted() {
    console.log("Component has been created!");
    this.query();
  }
};
</script>
