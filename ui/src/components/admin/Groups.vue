<template>
  <div class="admin-groups">
    <button class="btn btn-success pull-right" v-on:click="createGroup()">
      <v-icon>mdi-plus-thick</v-icon>
      Create Group
    </button>
    <br />
    <v-data-table
      :items="groups"
      :headers="headers"
      :search="search"
      class="elevation-4"
      item-key="name"
    >
      <template v-slot:item.members="{ item }">
        <small v-for="user in item.members" :key="user.name"
          >{{ user.fullname }} |
        </small>
      </template>
      <template v-slot:item.actions="{ item }">
        <v-icon small class="mr-2" @click="editGroup(item)">
          mdi-pencil
        </v-icon>
        <v-icon small @click="deleteGroup(item)">
          mdi-delete
        </v-icon>
      </template>
    </v-data-table>
    <v-dialog v-model="show_groupform">
      <GroupForm @close="closeForm" v-bind:groupdata="current_group"></GroupForm>
    </v-dialog>
  </div>
</template>

<script>
import GroupForm from "@/components/admin/GroupForm.vue";

export default {
  components: { GroupForm },
  data() {
    return {
      groups: [],
      current_group: {},
      show_groupform: false,
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
      this.$http.get(`${this.$config.api}/group/all`).then(
        res => {
          this.groups = res.data;
          console.log(this.results.length + " groups retrieved from db");
          console.log(this.results);
        },
        err => {
          console.log("Error contacting API");
          console.dir(err);
        }
      );
    },
    closeForm: function() {
      this.show_groupform = false;
    },
    createGroup: function() {
      this.show_groupform = true;
      console.log("createGroup called");
    },
    deleteGroup: function() {
      console.log("deleteGroup called");
    },
    editGroup: function(group) {
      this.current_group = group;
      this.show_groupform = true;
      console.log("editGroup called", group);
    }
  },
  mounted() {
    // console.log("Component has been created!");
    this.query();
  }
};
</script>
