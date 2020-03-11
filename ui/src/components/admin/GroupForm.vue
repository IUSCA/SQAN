<template>
  <div>
    <div class="row" v-if="show_groupform">
      <div class="col-sm-10">
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
                  ng-model="groupform.name"
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
                  ng-model="groupform.desc"
                />
              </div>
            </div>
            <div class="form-group">
              <label for="inputEmail" class="col-lg-2 control-label"
                >Members</label
              >
              <div class="col-lg-10">
                <ui-select multiple ng-model="groupform.members" required>
                  <ui-select-match placeholder="Select members of this group">
                    <b>{{ $item.fullname }}</b>
                    <span class="email">&lt;{{ $item.email }}&gt;</span>
                  </ui-select-match>
                  <ui-select-choices
                    repeat="user in users | propsFilter: {fullname: $select.search, email: $select.search}"
                  >
                    <b>{{ user.fullname }}</b>
                    <small>&lt;{{ user.email }}&gt;</small>
                  </ui-select-choices>
                </ui-select>
              </div>
            </div>
            <div class="form-group">
              <div class="col-lg-10 col-lg-offset-2">
                <button
                  type="reset"
                  class="btn btn-default"
                  ng-click="hideGroupform();"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="btn btn-primary"
                  ng-click="submitGroupform(); event.preventDefault();"
                >
                  Submit
                </button>
              </div>
            </div>
          </fieldset>
        </form>
      </div>
    </div>
  </div>
</template>
