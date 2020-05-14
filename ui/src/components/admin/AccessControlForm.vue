<template>
  <span>

  <v-snackbar
    v-model="snackbar"
    top
    right
    :timeout="timeout"
  >
    {{status}}
    <v-btn
      color="red"
      text
      @click="snackbar = false"
    >
      Close
    </v-btn>
  </v-snackbar>

  <v-dialog v-model="show_form" max-width="500">
    <template v-slot:activator="{ on }">
      <span v-on="on">
        <slot name="label">
          <v-btn x-small color="blue lighten-2" dark class="ma-2">
            <v-icon x-small>mdi-pencil</v-icon>
          </v-btn>
        </slot>
      </span>
    </template>

    <v-form
      ref="form"
    >

    <v-card>
      <v-card-title class="blue lighten-2">
        <v-icon>mdi-lock</v-icon>
        Edit ACL
      </v-card-title>

      <v-card-text class="mt-3">
        <v-text-field
          v-model="acl_list"
          label="ACL Group(s)"
          prepend-icon="mdi-lock"
          required
          disabled
        ></v-text-field>

        <v-autocomplete
          v-model="canView"
          prepend-icon="mdi-eye"
          label="Can View"
          :items="groups"
          item-text="name"
          item-value="_id"
          outlined
          dense
          chips
          small-chips
          multiple
        ></v-autocomplete>

        <v-autocomplete
          v-model="canQC"
          prepend-icon="mdi-check"
          label="Can QC"
          :items="groups"
          item-text="name"
          item-value="_id"
          outlined
          dense
          chips
          small-chips
          multiple
        ></v-autocomplete>

      </v-card-text>

      <v-spacer></v-spacer>


      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          color="blue white--text"
          @click="updateACLs"
        >
          Confirm
        </v-btn>
      </v-card-actions>
    </v-card>
    </v-form>
  </v-dialog>
    </span>
</template>

<script>
  export default {
    props: {
      acls: Array,
      groups: Array,
    },
    data() {
      return {
        show_form: false,
        canView: [], //merged list of allowed groups when batch editing
        canQC: [],
        snackbar: false,
        status: '',
        timeout: 4000

      };
    },
    computed: {
      acl_list() {
        if(this.acls.length > 5)  return `${this.acls.length} ACL Groups`;
        else {
          let list = "";
          this.acls.map(a => {
            list += a.IIBISID + ' | ';
          })
          return list;
        }
      }
    },
    methods: {
      closeForm: function() {
        this.show_form = false;
      },
      updateCanView: function() {
        let self = this;
        this.canView = [];
        this.acls.forEach(a => {
          a.view.groups.forEach(ag => {
            if(!self.canView.includes(ag)) self.canView.push(ag);
          })
        })
      },
      updateCanQC: function() {
        let self = this;
        this.canQC = [];
        this.acls.forEach(a => {
          a.qc.groups.forEach(ag => {
            if(!self.canQC.includes(ag)) self.canQC.push(ag);
          })
        })
      },
      cleanGroups: function(_groups) {
        let _ids = this.groups.map(g => {return g._id});
        console.log(_ids);
        console.log(_groups);
        let clean = _groups.filter(_g => {
          return _ids.includes(_g);
        })
        console.log(clean);
        return clean;
      },
      updateACLs: function() {
        console.log(this.acls);
        let data = {};
        let cleanView = this.cleanGroups(this.canView);
        let cleanQC = this.cleanGroups(this.canQC);
        this.acls.map(a => {
          data[a.IIBISID] = {
            view: {groups: cleanView, users: []},
            qc: {groups: cleanQC, users: []}
          };
          return;
        });

        let self = this;

        this.$http
          .put(`${this.$config.api}/acl/iibisid`, data)
          .then(function(res) {
            console.log(res.data);
            self.show_form = false;
            self.snackbar = false;
            self.status = res.data.msg;
            self.snackbar = true;
            self.$emit("updated");

          }, err => {console.log(err)});
      }

    },
    mounted() {
    },
    watch: {
      show_form() {
        console.log("Showing it!");
        this.updateCanView();
        this.updateCanQC();
      }
    }
  };
</script>

<style scoped>

</style>
