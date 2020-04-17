<template>
  <v-card>
    <v-card-title>
      <v-icon>mdi-account-group</v-icon>
      New / Edit Group
    </v-card-title>
    <form class="form-horizontal" name="group_form">
      <fieldset>
        <div class="form-group">
          <label for="inputUsername" class="col-lg-2 control-label">Name</label>
          <div class="col-lg-10">
            <input
              type="text"
              class="form-control"
              id="inputUsername"
              placeholder="Name"
              v-model="groupdata.name"
            />
          </div>
        </div>
        <div class="form-group">
          <label for="inputFullname" class="col-lg-2 control-label"
            >Description</label
          >
          <div class="col-lg-10">
            <input
              type="text"
              class="form-control"
              id="inputFullname"
              placeholder="Description"
              autocomplete="off"
              v-model="groupdata.desc"
            />
          </div>
        </div>
        <div class="form-group">
          <label for="inputEmail" class="col-lg-2 control-label">Members</label>
          <div class="col-lg-10">
            <v-select
              multiple
              v-model="groupdata"
              required
              :items="groupdata.members"
            >
            </v-select>
          </div>
        </div>
        <v-card-actions>
          <v-btn
            type="reset"
            class="btn btn-default"
            @click="$emit('close', true)"
          >
            Cancel
          </v-btn>
          <v-btn
            type="submit"
            class="btn btn-primary"
            @click="
              submitgroupdata();
              event.preventDefault();
            "
          >
            Submit
          </v-btn>
        </v-card-actions>
      </fieldset>
    </form>
  </v-card>
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
    return {};
  },
  submitgroupdata() {
    console.log("submit data");
  },
  mounted() {
    console.log("Group form has been created!");
    console.log(this.group);
  }
};
</script>
