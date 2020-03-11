<template>
  <div>
    <div class="row" v-if="show_userform">
      <div class="col-sm-10">
        <form class="form-horizontal" name="user_form">
          <fieldset>
            <legend><i class="fa fa-2x fa-user"></i>New/Edit User</legend>
            <div class="form-group">
              <label for="inputUsername" class="col-lg-2 control-label"
                >Username</label
              >
              <div class="col-lg-10">
                <input
                  type="text"
                  class="form-control"
                  id="inputUsername"
                  placeholder="Username"
                  autocomplete="off"
                  ng-model="userform.username"
                />
              </div>
            </div>
            <div class="form-group">
              <label for="inputFullname" class="col-lg-2 control-label"
                >Name</label
              >
              <div class="col-lg-10">
                <input
                  type="text"
                  class="form-control"
                  id="inputFullname"
                  placeholder="Full name"
                  autocomplete="off"
                  ng-model="userform.fullname"
                />
              </div>
            </div>
            <div class="form-group">
              <label for="inputEmail" class="col-lg-2 control-label"
                >Email</label
              >
              <div class="col-lg-10">
                <input
                  type="text"
                  class="form-control"
                  id="inputEmail"
                  placeholder="Email"
                  autocomplete="off"
                  ng-model="userform.email"
                />
              </div>
            </div>
            <div class="form-group">
              <label for="inputRoles" class="col-lg-2 control-label"
                >Roles</label
              >
              <div class="col-lg-10">
                <ui-select multiple ng-model="userform.roles" required>
                  <ui-select-match placeholder="Select roles for this user">
                    <b>{{ $item }}</b>
                  </ui-select-match>
                  <ui-select-choices
                    repeat="role in user_roles | filter: $select.search"
                  >
                    <b>{{ role }}</b>
                  </ui-select-choices>
                </ui-select>
              </div>
            </div>

            <div class="form-group">
              <label for="inputPrimary" class="col-lg-2 control-label"
                >Primary Role</label
              >
              <div class="col-lg-10">
                <select
                  class="form-control"
                  id="select"
                  ng-model="userform.primary_role"
                >
                  <option v-for="role in userform.roles">{{ role }}</option>
                </select>
                <span class="help-block"
                  >Add roles to user to add primary role options</span
                >
              </div>
            </div>
            <div class="form-group">
              <div class="col-lg-10 col-lg-offset-2">
                <button
                  type="reset"
                  class="btn btn-default"
                  ng-click="hideUserform()"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="btn btn-primary"
                  ng-click="submitUserform(); event.preventDefault();"
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
