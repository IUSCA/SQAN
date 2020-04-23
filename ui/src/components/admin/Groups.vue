<template>
  <div class="admin-groups">
      <GroupForm v-bind:groupdata="current_group"></GroupForm>
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
        <GroupForm @refresh="query" v-bind:groupdata="item">
          <template v-slot:label>
            <v-icon small class="mr-2">
              mdi-pencil
            </v-icon>
          </template>
        </GroupForm>
        <v-icon small @click="deleteGroup(item)">
          mdi-delete
        </v-icon>
      </template>
    </v-data-table>
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
    deleteGroup: function() {
      console.log("deleteGroup called");
    },
  },
  mounted() {
    // console.log("Component has been created!");
    this.query();
  }
};
</script>
