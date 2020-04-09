<template>
  <v-card>
    <v-row align="center">
      <v-col cols="12" sm="6">
        <form class="form-horizontal" name="group_form">
          <fieldset>
            <legend><i class="fa fa-2x fa-user"></i>New/Edit Group</legend>
            <div class="form-group">
              <label for="inputUsername" class="col-lg-2 control-label"
                >Name</label
              >
              <div class="col-lg-10">
                <input
                  type="text"
                  class="form-control"
                  id="inputUsername"
                  placeholder="Name"
                  autocomplete="off"
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
              <label for="inputEmail" class="col-lg-2 control-label"
                >Members</label
              >
              <div class="col-lg-10">
                <v-select
                  multiple
                  v-model="groupdata"
                  required
                  :item="groupdata.members"
                >
                </v-select>
              </div>
            </div>
            <div class="form-group">
              <div class="col-lg-10 col-lg-offset-2">
                <button
                  type="reset"
                  class="btn btn-default"
                  @click="hidegroupdata()"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="btn btn-primary"
                  @click="
                    submitgroupdata();
                    event.preventDefault();
                  "
                >
                  Submit
                </button>
              </div>
            </div>
          </fieldset>
        </form>
      </v-col>
    </v-row>
  </v-card>
</template>

<script>
export default {
  props: ["groupdata"],
  data() {
    return {};
  },
  mounted() {
    console.log("Group form has been created!");
    console.log(this.group);
  }
};
</script>
