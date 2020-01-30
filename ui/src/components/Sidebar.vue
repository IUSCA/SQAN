<template>
  <div class="sca-sidebar" v-if="!hideSidebar">
    <h2 class="text-muted">
      <router-link to="about">
        <b-img fluid src="../assets/sqan_logo.png" width="48"/>
      </router-link>
    </h2>
    <br />
    <br />

    <router-link to="exams">
      <div class="menu">
        <h3>
          <i class="fa fa-list-alt" aria-hidden="true"></i>
        </h3>Exams
      </div>
    </router-link>
    <router-link to="qc">
      <div
        class="menu"
        ng-class="{'active':  active_menu == 'exams1'}"
      >
        <h3>
          <i class="fa fa-check-square" aria-hidden="true"></i>
        </h3>QC1 Pending
      </div>
    </router-link>
    <router-link to="templatesummary">
      <div
        class="menu"
        ng-class="{'active':  active_menu == 'tsummary'}"
      >
        <h3>
          <i class="fa fa-files-o" aria-hidden="true"></i>
        </h3>Template Summary
      </div>
    </router-link>
    <router-link to="summary">
      <div
        class="menu"
        ng-class="{'active':  active_menu == 'rsummary'}"
      >
        <h3>
          <i class="fa fa-flask" aria-hidden="true"></i>
        </h3>Research Summary
      </div>
    </router-link>

    <div class="bottom">
      <router-link to="admin">
        <div
          class="menu"
          ng-if="user.isadmin"
          ng-class="{'active':  active_menu == 'admin'}"
        >
          <h3>
            <i class="fa fa-users" aria-hidden="true"></i>
          </h3>Access Control
        </div>
      </router-link>

      <router-link to="profile">
        <div
          class="menu"
          ng-if="!isguest"
          ng-class="{'active':  active_menu == 'profile'}"
        >
          <h3>
            <i class="fa fa-cog" aria-hidden="true"></i>
          </h3>Profile
        </div>
      </router-link>

      <div class="menu" onclick="$('#contact2').modal();">
        <h3>
          <i class="fa fa-envelope" aria-hidden="true"></i>
        </h3>Contact
      </div>

      <router-link to="signout">
        <div class="menu">
          <h3>
            <i class="fa fa-sign-out" aria-hidden="true"></i>
          </h3>Logout
        </div>
      </router-link>
    </div>

    <!--
    <div id="settings-menu" ng-if="show_settings">
        <a href="/profile" class="menu">Profile</a>
    </div>
    -->
  </div>
</template>

<script>
export default {
  components: {},
  data() {
    return {
      hideSidebar: false
    };
  }
};
</script>

<style>
</style>