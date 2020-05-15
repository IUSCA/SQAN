<template>
  <v-dialog v-model="show_groupform" max-width="750">
    <template v-slot:activator="{ on }">
      <span v-on="on">
        <slot name="label">
          <v-btn color="green lighten-2" dark class="ma-2">
            <v-icon>mdi-plus-thick</v-icon>
            Create Group
          </v-btn>
        </slot>
      </span>
    </template>

    <v-form ref="group_form">
    <v-card>
      <v-card-title>
        <v-icon>mdi-account-group</v-icon>
        New / Edit Group
      </v-card-title>
        <v-card-text>

          <v-text-field
            class="form-control"
            id="inputGroupname"
            label="Name"
            placeholder="Name"
            v-model="groupdataLocal.name"
          />


          <v-text-field
            class="form-control"
            id="inputFullname"
            label="Description"
            placeholder="Description"
            autocomplete="off"
            v-model="groupdataLocal.desc"
          />


          <v-autocomplete
            multiple
            label="Members"
            v-model="groupdataLocal.members"
            required
            outlined
            dense
            chips
            small-chips
            :items="userlist"
            item-text="fullname"
            item-value="_id"
          >
          </v-autocomplete>

        </v-card-text>

      <v-spacer></v-spacer>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          color="green white--text"
          @click="submitgroupdata"
        >
          Submit
        </v-btn>
      </v-card-actions>
    </v-card>
    </v-form>
  </v-dialog>
</template>

<script>
export default {
  props: {
    groupdata: {
      type: Object,
      default: () => ({
        name: "",
        desc: "",
        members: [],
      })
    },
    userlist: Array,
    newGroup: Boolean
  },
  data() {
    return {
      show_groupform: false,
      groupdataLocal: { ...this.groupdata }
    };
  },
  methods: {
    closeForm: function() {
      this.show_groupform = false;
    },
    submitgroupdata() {
      console.log(this.groupdataLocal);
      console.log("submit data");
      let method = '';
      let url =  '';
      if(this.newGroup) {
        console.log("creating new group");
        method = 'post';
        url = `${this.$config.api}/group`;
      } else {
        console.log("updating existing group");
        method = 'patch';
        url = `${this.$config.api}/group/${this.groupdata._id}`;
      }

      let self = this;
      this.$http({method: method, url: url, data: this.groupdataLocal})
        .then(res => {
          console.log(res.data);
          self.$emit('submitted');
          self.$store.dispatch('snack', res.data.message);
          self.closeForm();
        }, err => {
          self.$store.dispatch('snack', err);
          console.log(err);
        })
    },
  },
  mounted() {
    console.log("Group form has been created!");
    console.log(this.groupdataLocal);
  }
};
</script>

<style scoped>
i {
  padding-right: 10px;
}
</style>
