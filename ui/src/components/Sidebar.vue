<template>
  <div class="sca-sidebar" v-if="!hideSidebar">
    <h2 class="text-muted">
      <router-link to="about">
        <b-img fluid src="../assets/sqan_logo.png" width="48" />
      </router-link>
    </h2>
    <br />
    <br />

    <router-link to="exams">
      <div class="menu" :class="{ active: this.$route.name == 'exams' }">
        <h3>
          <font-awesome-icon icon="list-alt" aria-hidden="true" />
        </h3>
        Exams
      </div>
    </router-link>

    <router-link to="qc">
      <div class="menu" :class="{ active: this.$route.name == 'qc' }">
        <h3>
          <font-awesome-icon icon="check-square" aria-hidden="true" />
        </h3>
        QC1 Pending
      </div>
    </router-link>

    <router-link to="templatesummary">
      <div
        class="menu"
        :class="{ active: this.$route.name == 'templatesummary' }"
      >
        <h3>
          <font-awesome-icon :icon="['far', 'clone']" aria-hidden="true" />
        </h3>
        Template Summary
      </div>
    </router-link>

    <router-link to="researchsummary">
      <div
        class="menu"
        :class="{ active: this.$route.name == 'researchsummary' }"
      >
        <h3>
          <font-awesome-icon icon="flask" aria-hidden="true" />
        </h3>
        Research Summary
      </div>
    </router-link>

    <div class="bottom">
      <router-link to="admin">
        <div
          class="menu"
          v-if="user.isadmin"
          :class="{ active: this.$route.name == 'admin' }"
        >
          <h3>
            <font-awesome-icon icon="users" aria-hidden="true" />
          </h3>
          Access Control
        </div>
      </router-link>

      <router-link to="profile">
        <div
          class="menu"
          ng-if="!isguest"
          ng-class="{'active':  active_menu == 'profile'}"
        >
          <h3>
            <font-awesome-icon icon="cog" aria-hidden="true" />
          </h3>
          Profile
        </div>
      </router-link>

      <div class="menu" onclick="$('#contact2').modal();">
        <h3>
          <font-awesome-icon icon="envelope" aria-hidden="true" />
        </h3>
        Contact
      </div>

      <router-link to="signout">
        <div class="menu">
          <h3>
            <font-awesome-icon icon="sign-out-alt" aria-hidden="true" />
          </h3>
          Logout
        </div>
      </router-link>
    </div>
  </div>
</template>

<script>
export default {
  components: {},
  data() {
    //TODO: configure access to user object for admin check
    return {
      user: {
        isadmin: true,
        isguest: false
      },
      hideSidebar: false
    };
  }
};
</script>

<style>
.sca-sidebar {
  position: fixed;
  top: 0px;
  left: 0px;
  z-index: 999;
  width: 80px;
  height: 100%;
  background-color: #eee;
  border-right: 1px solid #ddd;
  text-align: center;
}
.sca-sidebar .menu {
  color: #aaa;
  width: 80px;
  transition: 0.5s ease all;
  cursor: pointer;
  margin: 3px 0px;
  padding: 8px;
  font-size: 8pt;
}
.sca-sidebar .menu h2 {
  color: #878787;
  font-weight: bold;
  font-size: 21px;
}
.sca-sidebar .menu h3 {
  margin-top: 0;
  margin-bottom: 5px;
  color: #666;
  text-transform: uppercase;
  font-size: 18px;
}
.sca-sidebar .menu:hover {
  background-color: #ddd;
  color: #008cba;
}
.sca-sidebar .menu:hover h3 {
  color: #008cba;
}
.sca-sidebar .menu.active {
  background-color: #008cba;
  color: white;
}
.sca-sidebar .menu.active h3 {
  color: white;
}
.sca-sidebar .bottom {
  position: fixed;
  bottom: 0px;
  width: 80px;
}
.sca-sidebar hr {
  margin: 5px 0px;
}
</style>
