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
      <span v-if="$store.getters.hasRole('admin')">
        <v-divider class="mb-5"></v-divider>
        <v-list-item v-for="item in admin_items_filtered" :value="item.active" :key="item.title" :to="item.path" @click="navChange(item)">
          <v-list-item-action>
            <v-icon>{{item.action}}</v-icon>
          </v-list-item-action>
          <v-list-item-content>
            <v-list-item-title>{{item.title}}</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </span>
      <v-divider class="mb-5"></v-divider>
      <span v-if="$store.getters.hasRole('user')">
      <v-list-item v-for="item in user_items" :value="item.active" :key="item.title" :to="item.path" @click="navChange(item)">
        <v-list-item-action>
          <v-icon>{{item.action}}</v-icon>
        </v-list-item-action>
        <v-list-item-content>
          <v-list-item-title>{{item.title}}</v-list-item-title>
        </v-list-item-content>
      </v-list-item>
      </span>
      <span v-if="$store.getters.hasRole('guest')">
      <v-list-item v-for="item in guest_items" :value="item.active" :key="item.title" :to="item.path" @click="navChange(item)">
        <v-list-item-action>
          <v-icon>{{item.action}}</v-icon>
        </v-list-item-action>
        <v-list-item-content>
          <v-list-item-title>{{item.title}}</v-list-item-title>
        </v-list-item-content>
      </v-list-item>
      </span>
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
          {
            action: 'mdi-file-chart',
            title: 'Reports',
            path: 'report',
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
        guest_items: [
          {
            action: 'mdi-information',
            title: 'About',
            path: 'about',
          },
          {
            action: 'mdi-logout-variant',
            title: 'Logout',
            path: 'signout',
          },
        ],
        admin_items: [
          {
            action: 'mdi-upload',
            title: 'Upload',
            path: 'upload',
          },
          {
            action: 'mdi-file-key',
            title: 'QC Keys',
            path: 'qckeys',
          },
          {
            action: 'mdi-database-alert',
            title: 'QC Error Counts',
            path: 'qcerrors',
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
    computed: {
      admin_items_filtered() {
        if(this.$config.upload_enabled) return this.admin_items;
        return this.admin_items.filter(ai => {
          return ai.path !== 'upload';
        })
      }
    },
    methods: {
      navChange: function(navItem) {
        this.drawer = false;
        this.$emit('navChange', navItem);
      },
      checkRoute: function() {
        console.log("checking route");
        let currentPath = this.$router.currentRoute.path;
        console.log(currentPath);
        this.items.forEach(item => {
          if(currentPath.includes(item.path)) this.navChange(item);
        });

        this.admin_items.forEach(item => {
          if(currentPath.includes(item.path)) this.navChange(item);
        });

        this.user_items.forEach(item => {
          if(currentPath.includes(item.path)) this.navChange(item);
        });

        if(currentPath === '/') this.navChange(this.items[0]);


      }
    },
    mounted() {
      let self = this;
      setTimeout(function() {
        self.checkRoute();
      }, 200);
    },
    watch: {
      '$route' (to, from) {
        console.log(to);
        console.log(from);
        this.checkRoute();
      }
    }
  }
</script>

<style>
  a {
    text-decoration: none !important;
  }

  .v-navigation-drawer__content {
    background-image: linear-gradient(to bottom, white, white, white, white, #0277bd, #0277bd);
  }

  .v-list {
    background-image: none !important;
  }
</style>
