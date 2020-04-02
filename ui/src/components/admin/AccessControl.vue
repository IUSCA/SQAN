<template>
  <div>
    <v-data-table
      :items="acls"
      :headers="headers"
      :search="search"
      show-select
      class="elevation-4"
      item-key="name"
    >
      <template v-slot:item.members="{ item }">
        <small v-for="user in item.members" :key="user.name"
          >{{ user.fullname }} |
        </small>
      </template>
    </v-data-table>

    <table class="table table-condensed table-bordered">
      <tbody>
        <tr v-for="iibisid in iibisids" :key="iibisid.id">
          <td ng-click="_selected[iibisid] = !_selected[iibisid]">
            <i
              class="text-info fa fa-fw"
              ng-class="{'fa-check-square-o': _selected[iibisid], 'fa-square-o': !_selected[iibisid]}"
            >
            </i>
          </td>
          <th>{{ iibisid }}</th>
          <td>
            <ui-select multiple ng-model="_acl[iibisid].view.groups">
              <ui-select-match
                placeholder="Select groups who can view this research"
              >
                <b>{{ $item.name }}</b>
                <!--<span v-for="member in $item.Members">{{member.fullname}} | </span>-->
                <span class="text-muted"
                  >({{ $item.members.length }} users)</span
                >
              </ui-select-match>
              <ui-select-choices
                repeat="group in groups | propsFilter: {name: $select.search}"
              >
                <b>{{ group.name }}</b>
                <span class="text-muted">{{ group.desc }}</span>
                <!--<span v-for="member in group.Members">{{member.fullname}} | </span>-->
                <span class="text-muted"
                  >({{ group.members.length }} users)</span
                >
              </ui-select-choices>
            </ui-select>
          </td>
          <td>
            <ui-select multiple ng-model="_acl[iibisid].qc.groups">
              <ui-select-match
                placeholder="Select groups who can QC this research"
              >
                <b>{{ $item.name }}</b>
                <!--<span v-for="member in $item.Members">{{member.fullname}} | </span>-->
                <span class="text-muted"
                  >({{ $item.members.length }} users)</span
                >
              </ui-select-match>
              <ui-select-choices
                repeat="group in groups | propsFilter: {name: $select.search}"
              >
                <b>{{ group.name }}</b>
                <span class="text-muted">{{ group.desc }}</span>
                <!--<span v-for="member in group.Members">{{member.fullname}} | </span>-->
                <span class="text-muted"
                  >({{ group.members.length }} users)</span
                >
              </ui-select-choices>
            </ui-select>
          </td>
        </tr>
      </tbody>
    </table>

    <input
      class="btn btn-primary pull-right"
      value="Update Access"
      ng-click="update_acl();"
    />
  </div>
</template>

<script>
export default {
  data() {
    return {
      headers: [
        {
          text: "IIBISID",
          value: "iibisid",
          sortable: true
        },
        {
          text: "Can View/Comment",
          value: "canview",
          sortable: true
        },
        {
          text: "Can QC",
          value: "canqc",
          sortable: true
        }
      ],
      show_aclform: false,
      search: "",
      acls: [],
      research: [],
      iibisids: [],
      users: [],
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
          res.data.forEach(function(research) {
            if (!~this.iibisids.indexOf(research.IIBISID))
              this.iibisids.push(research.IIBISID);
          });
          // is it possible to re-use the call from UserList?
          this.$http.get(`${this.$config.api}/user/all`).then(res => {
            this.users = res.data;
            console.log(this.users.length + " users retrieved from db");
            console.log(this.users);
          });
        })
        .then(res => {
          console.log(res)
          // can't we just use this.users?
          this.users.then(function(_users) {
            this.users_o = _users;
          });

          // same here... possible to reuse call from Groups?
          // best place?
          this.$http.get(`${this.$config.api}/group/all`).then(
            res => {
              this.groups = res.data;
              console.log(this.groups.length + " groups retrieved from db");
              console.log(this.groups);
            },
            err => {
              console.log("Error contacting API");
              console.dir(err);
            }
          );

          this.groups.then(function(_groups) {
            this.groups = _groups;
            //conver to easy to lookup object
            this.groups_o = [];
            this.groups.forEach(function(group) {
              this.groups_o[group._id] = group;
            });
          });

          this.$http.get(`${this.$config.api}/acl/iibisid`).then(function(res) {
            console.log(res.data);
            this.acl = {};
            this._acl = {};
            res.data.forEach(function(iibis) {
              this.acl[iibis.IIBISID] = {
                qc: iibis.qc,
                view: iibis.view
              };
            });

            this.iibisids.forEach(function(id) {
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
              console.log(this.groups_o);
              for (var action in this.acl[id]) {
                var acl = this.acl[id][action];
                if (acl.groups)
                  acl.groups.forEach(function(gid) {
                    console.log(this.groups_o[gid]);
                    console.log(gid);
                    this._acl[id][action].groups.push(this.groups_o[gid]);
                  });
              }
            });
          }, this.toast_error);
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
    console.log("groups_o", this.groups_o);
    console.log("acls", this.acls);
  }
};
</script>
