<template>
  <v-navigation-drawer
    v-model="drawer"
    permanent
    expand-on-hover
    app
    class="elevation-8"
  >
    <v-list dense>
      <v-list-item @click="navChange(user_items[0])" to="about">
        <v-list-item-action>
          <img src="../assets/sqan_logo.png" width="30" alt="SQAN LOGO">
        </v-list-item-action>
        <v-list-item-content>
          <v-list-item-title class="title">
            SQAN
          </v-list-item-title>
          <v-list-item-subtitle>
            development
            <div class="caption">Logged in as {{$store.state.auth.uid}}</div>
          </v-list-item-subtitle>
        </v-list-item-content>
      </v-list-item>
      <v-divider class="mb-5"></v-divider>
      <v-list-item v-for="item in items" :value="item.active" :key="item.title" :to="item.path" @click="navChange(item)">
        <v-list-item-action>
          <v-icon>{{item.action}}</v-icon>
        </v-list-item-action>
        <v-list-item-content>
          <v-list-item-title>{{item.title}}</v-list-item-title>
        </v-list-item-content>
      </v-list-item>
      <v-divider class="mb-5"></v-divider>
      <v-list-item v-for="item in admin_items" :value="item.active" :key="item.title" :to="item.path" @click="navChange(item)">
        <v-list-item-action>
          <v-icon>{{item.action}}</v-icon>
        </v-list-item-action>
        <v-list-item-content>
          <v-list-item-title>{{item.title}}</v-list-item-title>
        </v-list-item-content>
      </v-list-item>
      <v-divider class="mb-5"></v-divider>
      <v-list-item v-for="item in user_items" :value="item.active" :key="item.title" :to="item.path" @click="navChange(item)">
        <v-list-item-action>
          <v-icon>{{item.action}}</v-icon>
        </v-list-item-action>
        <v-list-item-content>
          <v-list-item-title>{{item.title}}</v-list-item-title>
        </v-list-item-content>
      </v-list-item>
    </v-list>
  </v-navigation-drawer>
</template>

<script>
  export default {
    name: 'Drawer',
    data() {
      return {
        drawer: null,
        items: [
          {
            action: 'mdi-microscope',
            title: 'Exams',
            path: 'exams',
          },
          {
            action: 'mdi-checkbox-multiple-blank',
            title: 'Templates',
            path: 'templatesummary',
          },
          {
            action: 'mdi-flask',
            title: 'Research',
            path: 'researchsummary',
          },
        ],
        user_items: [
          {
            action: 'mdi-information',
            title: 'About',
            path: 'about',
          },
          {
            action: 'mdi-account-details',
            title: 'Profile',
            path: 'profile',
          },
          {
            action: 'mdi-logout-variant',
            title: 'Logout',
            path: 'signout',
          },
        ],
        admin_items: [
          {
            action: 'mdi-file-key',
            title: 'QC Keys',
            path: 'qckeys',
          },
          {
            action: 'mdi-upload',
            title: 'Upload',
            path: 'upload',
          },
          {
            action: 'mdi-cube-send',
            title: 'Dataflow',
            path: 'dataflow',
          },
          {
            action: 'mdi-shield-check',
            title: 'Access Control',
            path: 'admin',
          },
        ]
      }
    },
    methods: {
      navChange: function(navItem) {
        this.drawer = false;
        this.$emit('navChange', navItem);
      }
    },
    mounted() {
      let self = this;
      setTimeout(function() {
        let currentPath = self.$router.currentRoute.path;
        self.items.forEach(item => {
          if(currentPath.includes(item.path)) self.navChange(item);
        });

        self.admin_items.forEach(item => {
          if(currentPath.includes(item.path)) self.navChange(item);
        });

        self.user_items.forEach(item => {
          if(currentPath.includes(item.path)) self.navChange(item);
        })
      }, 200);
    }
  }
</script>

<style>
  a {
    text-decoration: none !important;
  }
</style>
