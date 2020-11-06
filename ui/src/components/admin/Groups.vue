<template>
  <div class="admin-groups">
      <GroupForm v-bind:groupdata="current_group" :userlist="user_list" :newGroup="true" v-on:submitted="query"></GroupForm>
    <br />
    <v-data-table
      :items="groups"
      :headers="headers"
      :search="search"
      class="elevation-4"
      item-key="name"
    >
      <template v-slot:item.members="{ item }">
        <v-chip x-small v-for="user in item.members" :key="user.name"
          >{{ user.fullname }}
        </v-chip>
      </template>
      <template v-slot:item.actions="{ item }">
        <GroupForm @refresh="query" v-bind:groupdata="item" :userlist="user_list" :newGroup="false" v-on:submitted="query">
          <template v-slot:label>
            <v-icon small class="mr-2 clickable" color="green lighten-2">
              mdi-pencil
            </v-icon>
          </template>
        </GroupForm>
        <Confirm
          title="Delete Group?"
          :message="deleteMessage(item)"
          color="red lighten-2"
          v-on:confirm="deleteGroup(item)"
        >
          <template v-slot:label>
            <v-icon small class="clickable" color="red lighten-2">
              mdi-delete
            </v-icon>
          </template>
        </Confirm>
      </template>
    </v-data-table>
  </div>
</template>

<script>
import GroupForm from "@/components/admin/GroupForm.vue";
import Confirm from "../Confirm";

export default {
  components: { GroupForm, Confirm },
  data() {
    return {
      groups: [],
      current_group: {},
      user_list: [],
      search: "",
      headers: [
        {
          text: "Name",
          value: "name",
          sortable: true
        },
        {
          text: "Description",
          value: "desc",
          sortable: true
        },
        {
          text: "Members",
          value: "members",
          sortable: true
        },
        { text: "Actions", value: "actions", sortable: false }
      ]
    };
  },

  methods: {
    query: function() {
      this.groups = [];
      this.$http.get(`${this.$config.api}/group/all`).then(
        res => {
          this.groups = res.data;
          console.log(res.data.length + " groups retrieved from db");
        },
        err => {
          console.log("Error contacting API");
          console.dir(err);
        }
      );
    },
    deleteMessage: function(group) {
      return `Are you sure you want to delete ${group.name} with ${group.members.length} members?`;
    },
    getUsers: function() {
      this.$http.get(`${this.$config.api}/user/all`).then(
        res => {
          this.user_list = res.data;
        },
        err => {
          console.log("Error contacting API");
          console.dir(err);
        }
      );
    },
    deleteGroup: function(group) {
      console.log("deleteGroup called");
      let self = this;
      this.$http.delete(`${this.$config.api}/group/${group._id}`).then(
        res => {
          console.log(res.data);
          self.query();
        },
        err => {
          console.log("Error contacting API");
          console.dir(err);
        }
      );
    },
  },
  mounted() {
    // console.log("Component has been created!");
    this.query();
    this.getUsers();
  }
};
</script>
