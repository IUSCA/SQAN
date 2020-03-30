<template>
  <div class="Admin">
    <div class="row">
      <div class="col-sm-12">
        <v-tabs v-model="tab" @change="changeTab" icons-and-text>
          <v-tab
            v-for="(section, index) in sections"
            :key="index"
          >
            {{ section }}
         </v-tab>
        </v-tabs>

        <v-tabs-items v-model="tab">
          <v-tab-item v-for="section in sections" :key="section">
            <h3>
              <v-icon>mdi-account-multiple</v-icon>Users
            </h3>
            <button
              class="btn btn-success pull-right"
              v-on:click="createUser()"
            >
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
            </v-data-table>

            <hr />
          </v-tab-item>
        </v-tabs-items>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "admin",
  // TODO:
  // make sure users are sorted by 'primary_role':
  //             v-for="user in users | orderBy: 'primary_role'">
  data() {
    return {
      users: [],
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
        }
      ],
      sections: ["users", "Groups", "ACL"],
      search: "",
      selected: "",
      tab: "",
      current_tab: "users",
      show_userform: false,
      show_groupform: false
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

    changeTab() {
      console.log(this.tab);
      this.current_tab = this.tab;
      //this.query();
    },
    createUser: function() {
      console.log("createUser called");
    },
    deleteUser: function() {
      console.log("deleteUser called");
    },
    editUser: function() {
      console.log("editUser called");
    }
  },

  mounted() {
    // console.log("Component has been created!");
    this.query();
  }
};
</script>
