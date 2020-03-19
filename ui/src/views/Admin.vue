<template>
  <div class="Admin">
    <div class="row">
      <div class="col-sm-12">
        <h3><i class="fa fa-users"></i> Accounts and Access Control</h3>

        <hr />
        <div class="row">
          <b-tabs
            type="tabs"
            active="active_tab"
            v-if="!show_userform && !show_groupform"
          >
            <b-tab index="0" select="active_tab = 0">
              <template v-slot:title>
                <i class="fa fa-fw fa-user"></i> Users
              </template>
              <button
                class="btn btn-success pull-right"
                v-on:click="createUser()"
              >
                <i class="fa fa-fw fa-user-plus"></i> Create User
              </button>
              <br />
              <table class="table table-condensed table-bordered">
                <thead>
                  <tr>
                    <th></th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Primary Role</th>
                    <th>Roles</th>
                    <th>Created</th>
                    <th>Last Login</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(user, index) in users"
                    v-bind:user="user"
                    v-bind:index="index"
                    v-bind:key="user.name"
                  >
                    <td class="text-center">
                      <font-awesome-icon
                        :icon="userIcon(user)"
                        aria-hidden="true"
                      />

                      <i
                        class="fa fa-fw "
                        ng-class="{
                                    }"
                      ></i>
                    </td>
                    <td>{{ user.fullname }}</td>
                    <td>{{ user.email }}</td>
                    <td>{{ user.primary_role }}</td>
                    <td>{{ user.roles.join(" | ") }}</td>
                    <td>{{user.createDate | date:'short'}}</td>
                    <td>{{user.lastLogin | date:'short'}}</td>
                    <td>
                      <i
                        class="fa fa-fw fa-edit text-warning"
                        v-on:click="editUser(user)"
                      ></i>
                      <i
                        class="fa fa-fw fa-trash-o text-danger"
                        v-on:click="deleteUser(user)"
                      ></i>
                    </td>
                  </tr>
                </tbody>
              </table>
            </b-tab>
          </b-tabs>
        </div>
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
      search: "",
      selected: "",
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
