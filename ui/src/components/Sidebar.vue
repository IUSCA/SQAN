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
          <b-icon-list-check aria-hidden="true" />
          <i class="fa fa-list-alt" aria-hidden="true"></i>
        </h3>
        Exams
      </div>
    </router-link>
    <router-link to="qc">
      <div class="menu" :class="{ active: this.$route.name == 'qc' }">
        <h3>
          <b-icon-check-box aria-hidden="true" />
          <i class="fa fa-check-square" aria-hidden="true"></i>
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
          <b-icon-images aria-hidden="true" />
          <i class="fa fa-files-o" aria-hidden="true"></i>
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
          <b-icon-pie-chart-fill aria-hidden="true" />
          <i class="fa fa-flask" aria-hidden="true"></i>
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
            <b-icon-people-fill aria-hidden="true" />
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
            <b-icon-gear-fill aria-hidden="true" />
          </h3>
          Profile
        </div>
      </router-link>

      <div class="menu" onclick="$('#contact2').modal();">
        <h3>
          <i class="fa fa-envelope" aria-hidden="true"></i>
        </h3>
        Contact
      </div>

      <router-link to="signout">
        <div class="menu">
          <h3>
            <i class="fa fa-sign-out" aria-hidden="true"></i>
          </h3>
          Logout
        </div>
      </router-link>
    </div>
  </div>
</template>

<script>
import {
  BIconListCheck,
  BIconCheckBox,
  BIconPeopleFill,
  BIconPieChartFill,
  BIconImages,
  BIconGearFill
} from "bootstrap-vue";

export default {
  components: {
    BIconListCheck,
    BIconCheckBox,
    BIconPeopleFill,
    BIconPieChartFill,
    BIconImages,
    BIconGearFill
  },
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
