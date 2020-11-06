<template>
  <div>
    <v-col cols="3">
      <v-text-field
        v-model="filter"
        prepend-icon="mdi-filter"
        label="Filter"
        single-line
        hide-details
      ></v-text-field>
    </v-col>

    <div class="text-right">
      <AccessControlForm :acls="selected" :groups="groups" v-on:updated="query">
        <template v-slot:label>
          <v-btn color="blue lighten-2" class="my-2" :disabled="!selected.length" >
            <v-icon small>
              mdi-pencil
            </v-icon> Edit {{selected.length}} Research Groups
          </v-btn>
        </template>
      </AccessControlForm>
    </div>


    <v-data-table
      v-model="selected"
      :items="acl"
      :headers="headers"
      :search="filter"
      show-select
      class="elevation-4"
      disable-pagination
      hide-default-footer
      item-key="IIBISID"
    >
      <template v-slot:item.view="{ item }">
        <v-chip x-small v-for="group in item.view.groups" class="my-1 mx-1" :key="group">{{groupName(group)}}</v-chip>
      </template>
      <template v-slot:item.qc="{ item }">
        <v-chip x-small v-for="group in item.qc.groups" class="my-1 mx-1" :key="group">{{groupName(group)}}</v-chip>
      </template>
      <template v-slot:item.actions="{ item }">
        <AccessControlForm :acls="[item]" :groups="groups" v-on:updated="query"></AccessControlForm>
        <Confirm
          title="Delete ACL Group?"
          :message="deleteMessage(item)"
          color="red lighten-2"
          v-on:confirm="deleteACL(item)"
        >
          <template v-slot:label>
            <v-icon small>
              mdi-delete
            </v-icon>
          </template>
        </Confirm>
      </template>
    </v-data-table>

  </div>
</template>

<script>

  import Confirm from "../Confirm";
  import AccessControlForm from "./AccessControlForm";

  export default {
    components: {Confirm, AccessControlForm},
    data() {
      return {
        headers: [
          {
            text: "IIBISID",
            value: "IIBISID",
            sortable: true
          },
          {
            text: "Can View/Comment",
            value: "view",
            sortable: true
          },
          {
            text: "Can QC",
            value: "qc",
            sortable: true
          },
          {
            text: "Actions",
            value: "actions",
            sortable: false,
          }
        ],
        show_aclform: false,
        selected: [],
        filter: "",
        acl: [],
        research: [],
        iibisids: [],
        groups: [],
        groups_o: {}
      };
    },

    methods: {
      deleteMessage: function(acl) {
        return `Are you sure you want to delete the ACL controls for research related to ${acl.IIBISID}?  No users will be able to access these datasets.`;
      },
      query: function() {
        this.research = [];
        this.iibisids = [];
        this.groups = [];
        this.groups_o = {};
        this.selected = [];

        this.$http
          .get(`${this.$config.api}/research`, { params: { admin: true } })
          .then(res => {
            //find unique iibisids
            res.data.forEach(research => {
              if (!~this.iibisids.indexOf(research.IIBISID))
                this.iibisids.push(research.IIBISID);
            });
            console.log("iibisids:", this.iibisids);

            return this.$http.get(`${this.$config.api}/group/all`);
          })

          .then(res => {
            this.groups = res.data;

            //convert to easy to lookup object
            this.groups_o = {};
            this.groups.forEach(group => {
              this.groups_o[group._id] = group;
            });

            return this.$http.get(`${this.$config.api}/acl/iibisid`);
          })

          .then(res => {
            console.log(res.data);
            this.acl = res.data;
            /*
            this.acl = {};
            this._acl = {};
            res.data.forEach(iibis => {
              this.acl[iibis.IIBISID] = {
                qc: iibis.qc,
                view: iibis.view
              };
            });

            this.iibisids.forEach(id => {
              // console.log(id);
              //deal with case where acl is not set at all..
              if (this.acl[id] == undefined) {
                this.acl[id] = {
                  view: { groups: [] },
                  qc: { groups: [] }
                };
              }

              this._acl[id] = {
                view: { groups: [] },
                qc: { groups: [] }
              };

              //convert group id to object
              // console.log(this.groups_o);
              for (var action in this.acl[id]) {
                var acl = this.acl[id][action];
                if (acl.groups)
                  acl.groups.forEach(gid => {
                    // console.log(this.groups_o[gid]);
                    // console.log(gid);
                    this.acl[id][action].groups.push(this.groups_o[gid]);
                  });
              }

              */
            //});
          console.log("acl", this.acl);

          })
          .catch(err => {
            console.log("Error contacting API");
            console.dir(err);
          });
      },

      createACL: function() {
        console.log("createACL called");
      },
      deleteACL: function(acl) {
        console.log(acl);
        console.log("deleteACL called");
      },
      editACL: function() {
        console.log("editACL called");
      },
      groupName: function(group) {
        let group_o = this.groups_o[group];
        if(group_o === undefined) return 'Unknown Group';
        return group_o.name;
      }
    },
    mounted() {
      this.query();
      // console.log("groups_o", this.groups_o);
    }
  };
</script>
