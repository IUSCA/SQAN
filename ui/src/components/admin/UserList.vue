<template>
  <div class="UserList">
    <UserForm @refresh="query" v-bind:userdata="current_user" v-on:refresh="query"></UserForm>

    <v-data-table
      :items="users"
      dense
      :headers="headers"
      :search="search"
      class="elevation-4"
      item-key="name"
      disable-pagination
      hide-default-footer
    >
      <template v-slot:item.primary_role="{ item }">
        <v-icon small :color="userClass(item)">{{userIcon(item)}}</v-icon>
      </template>
      <template v-slot:item.roles="{ item }">
        <span v-for="role in item.roles" :key="role">
          <v-chip x-small :class="role === item.primary_role ? 'blue lighten-2':''">{{role}}</v-chip>
        </span>
      </template>
      <template v-slot:item.createDate="{ item }">
        {{ item.createDate | moment("YYYY-MM-DD") }}
      </template>
      <template v-slot:item.lastLogin="{ item }">
        {{ item.lastLogin | moment("from") }}
      </template>

      <template v-slot:item.actions="{ item }">
        <UserForm v-on:refresh="query" v-bind:userdata="item">
          <template v-slot:label>
            <v-icon small class="mr-2 clickable" color="green lighten-2">
              mdi-pencil
            </v-icon>
          </template>
        </UserForm>

        <Confirm
          title="Log in as user?"
          :message="sudoMessage(item)"
          color="orange"
          v-on:confirm="sudoUser(item)"
        >
          <template v-slot:label>
            <v-icon small class="mr-2 clickable" color="orange">
              mdi-account-convert
            </v-icon>
          </template>
        </Confirm>

        <Confirm
          title="Delete User?"
          :message="deleteMessage(item)"
          color="red lighten-2"
          v-on:confirm="deleteUser(item)"
        >
          <template v-slot:label>
            <v-icon small class="clickable" color="red lighten-2">
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
import {mapActions} from "vuex";

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
          text: "",
          value: "primary_role",
          sortable: true
        },
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
    ...mapActions(["login"]),
    query: function() {
      this.users = [];
      this.$http.get(`${this.$config.api}/user/all`).then(
        res => {
          this.users = res.data;
        },
        err => {
          console.log("Error contacting API");
          console.dir(err);
        }
      );
    },
    userIcon: function(user) {

      if (user.primary_role == "user") {
        return "mdi-account";
      } else if (user.primary_role == "admin") {
        return "mdi-lock";
      } else if (user.primary_role == "researcher") {
        return "mdi-flask";
      } else if (user.primary_role == "technologist") {
        return "mdi-cogs";
      } else if (user.primary_role == "guest") {
        return "mdi-account-outline"
      }
    },
    userClass: function(user) {
      if (user.primary_role == "admin") {
        return "red";
      } else if (user.primary_role == "researcher") {
        return "blue";
      } else if (user.primary_role == "technologist") {
        return "green";
      }
      return "gray";
    },
    deleteMessage: function(user) {
      return `Are you sure you want to delete ${user.fullname}?`;
    },

    sudoMessage: function(user) {
      return `Are you sure you want to log in as ${user.fullname}?  You will need to completely log out to revert this change.`;
    },

    deleteUser: function(user) {
      console.log("deleteUser called");

      this.$http.delete(`${this.$config.api}/user/` + user._id).then(
        res => {
          console.log("Delete successful", res);
          self.$store.dispatch('snack', "User deleted");
          this.query();
        },
        err => {
          self.$store.dispatch('snack', err);
          console.log("Delete failed", err);

        }
      );

    },
    sudoUser: function(user) {
      console.log("SudoUser has been called");
      let self = this;
      this.$http.get(`${this.$config.api}/user/spoof/${user._id}`).then(
        res => {
          console.log("sudo successful", res);
          self.$store.dispatch('snack', `Logging you in as user ${user.fullname}`);
          self.login(res.data);

          setTimeout(() => {
            console.log(self.$store.auth);
            self.$router.replace({'query': null});
            self.$router.push({path: '/exams'});
          }, 1000);
        },
        err => {
          self.$store.dispatch('snack', err);
          console.log("sudo failed", err);

        }
      );
    }
  },
  mounted() {
    console.log("Component has been created!");
    this.query();
  }
};
</script>
