<template>
  <div class="Admin">
    <div class="row">
      <div class="col-sm-12">
        <v-tabs v-model="tab" @change="changeTab" icons-and-text>
          <v-tab v-for="(section, index) in sections" :key="index">
            {{ section }}
          </v-tab>
        </v-tabs>

        <v-tabs-items v-model="tab">
          <v-tab-item key="users">
            <UserList></UserList>
          </v-tab-item>
          <v-tab-item key="groups">
            <Groups></Groups>
          </v-tab-item>
          <v-tab-item key="acl">
            <AccessControl></AccessControl>
          </v-tab-item>

        </v-tabs-items>
      </div>
    </div>
  </div>
</template>

<script>
import UserList from "@/components/admin/UserList.vue";
import Groups from "@/components/admin/Groups.vue";
import AccessControl from "@/components/admin/AccessControl.vue";

export default {
  components: { UserList, Groups, AccessControl },

  data() {
    return {
      name: "admin",
      sections: ["Users", "Groups", "ACL"],
      selected: "",
      tab: "",
      current_tab: "Users"
    };
  },

  methods: {
    changeTab() {
      //console.log(this.tab);
      this.current_tab = this.tab;
      //this.query();
    }
  },

};
</script>
