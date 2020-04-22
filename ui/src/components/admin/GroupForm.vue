<template>
  <v-dialog v-model="show_groupform">
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

    <v-card>
      <v-card-title>
        <v-icon>mdi-account-group</v-icon>
        New / Edit Group
      </v-card-title>
      <form
        v-on:submit.prevent="submitgroupdata"
        class="form-horizontal"
        name="group_form"
      >
        <fieldset>
          <div class="form-group">
            <label for="inputUsername" class="col-lg-2 control-label"
              >Name</label
            >
            <div class="col-lg-10">
              <v-text-field
                class="form-control"
                id="inputUsername"
                placeholder="Name"
                v-model="groupdataLocal.name"
              />
            </div>
          </div>
          <div class="form-group">
            <label for="inputFullname" class="col-lg-2 control-label"
              >Description</label
            >
            <div class="col-lg-10">
              <v-text-field
                class="form-control"
                id="inputFullname"
                placeholder="Description"
                autocomplete="off"
                v-model="groupdataLocal.desc"
              />
            </div>
          </div>
          <div class="form-group">
            <label for="inputEmail" class="col-lg-2 control-label"
              >Members</label
            >
            <div class="col-lg-10">
              <v-select
                multiple
                v-model="groupdataLocal"
                required
                :items="groupdataLocal.members"
              >
              </v-select>
            </div>
          </div>
          <v-card-actions>
            <v-btn type="reset" class="btn btn-default" @click="closeForm()">
              Cancel
            </v-btn>
            <v-btn
              type="submit"
              class="btn btn-primary"
              @click="
                submitgroupdata();
              "
            >
              Submit
            </v-btn>
          </v-card-actions>
        </fieldset>
      </form>
    </v-card>
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
        members: []
      })
    }
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
    createGroup: function() {
      this.show_groupform = true;
      console.log("createGroup called");
    },
    editGroup: function(group) {
      this.current_group = group;
      this.show_groupform = true;
      console.log("editGroup called", group);
    },
    submitgroupdata() {
      console.log(this.groupdataLocal);
      console.log("submit data");
    }
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
