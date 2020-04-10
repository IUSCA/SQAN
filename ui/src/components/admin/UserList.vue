<template>
  <div class="UserList">
    <button class="btn btn-success pull-right" v-on:click="createUser()">
      <v-icon>mdi-account-plus</v-icon>
      Create User
    </button>

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
        <v-icon small class="mr-2" @click="editUser(item)">
          mdi-pencil
        </v-icon>
        <v-icon small @click="deleteUser(item)">
          mdi-delete
        </v-icon>
      </template>
    </v-data-table>

    <hr />
    <v-dialog v-model="show_userform">
      <UserForm @close="closeForm" v-bind:userdata="current_user"></UserForm>
    </v-dialog>
  </div>
</template>

<script>
import UserForm from "@/components/admin/UserForm.vue";

export default {
  // TODO:
  // make sure users are sorted by 'primary_role':
  //             v-for="user in users | orderBy: 'primary_role'">
  components: { UserForm },
  data() {
    return {
      users: [],
      current_user: "",
      show_userform: false,
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
    closeForm: function() {
      this.show_userform = false;
    },
    createUser: function() {
      this.show_userform = true;
      console.log("createUser called");
    },
    deleteUser: function() {
      console.log("deleteUser called");
    },
    sudoUser: function() {
      console.log("sudoUser called");
    },
    editUser: function(user) {
      this.current_user = user;
      this.show_userform = true;
      console.log("editUser called");
    }
  },
  mounted() {
    console.log("Component has been created!");
    this.query();
  }
};
</script>