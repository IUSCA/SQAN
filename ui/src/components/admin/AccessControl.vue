<template>
  <div>
    <v-data-table
      :items="acl"
      :headers="headers"
      :search="search"
      show-select
      class="elevation-4"
      item-key="name"
    >
      <template v-slot:item.view="{ item }">
        <small v-for="group in item.view.groups" :key="group"
          >{{ group }} |
        </small>
      </template>
      <template v-slot:item.qc="{ item }">
        <small v-for="group in item.view.groups" :key="group"
          >{{ group }} |
        </small>
      </template>
    </v-data-table>

  </div>
</template>

<script>
export default {
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
        }
      ],
      show_aclform: false,
      search: "",
      acl: [],
      research: [],
      iibisids: [],
      groups: [],
      groups_o: []
    };
  },

  methods: {
    query: function() {
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
          this.groups_o = [];
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
    deleteACL: function() {
      console.log("deleteACL called");
    },
    editACL: function() {
      console.log("editACL called");
    }
  },
  mounted() {
    this.query();
    // console.log("groups_o", this.groups_o);
  }
};
</script>
