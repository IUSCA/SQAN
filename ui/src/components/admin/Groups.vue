<template>
  <div class="admin-groups">
    <uib-tab index="1" select="active_tab = 1">
      <uib-tab-heading>
        <i class="fa fa-fw fa-users"></i> Groups
      </uib-tab-heading>
      <button class="btn btn-success pull-right" ng-click="createGroup()">
        <i class="fa fa-fw fa-plus-circle"></i> Create Group
      </button>
      <br />
      <table class="table table-condensed table-bordered">
        <thead>
          <tr>
            <th>Name</th>
            <th>Description</th>
            <th>Members</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="group in groups">
            <td>{{ group.name }}</td>
            <td>{{ group.desc }}</td>
            <td>
              <small v-for="user in group.members"
                >{{ user.fullname }} |
              </small>
            </td>
            <td>
              <i
                class="fa fa-fw fa-edit text-warning"
                ng-click="editGroup(group)"
              ></i>
              <i
                class="fa fa-fw fa-trash-o text-danger"
                ng-click="deleteGroup(group)"
              ></i>
            </td>
          </tr>
        </tbody>
      </table>
    </uib-tab>
  </div>
</template>
