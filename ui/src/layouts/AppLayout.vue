<template>
  <v-app id="inspire">
    <v-navigation-drawer
      v-model="drawer"
      permanent
      expand-on-hover
      app
      class="elevation-8"
    >
      <Drawer @navChange="updateActive"></Drawer>
    </v-navigation-drawer>

    <v-content>
      <v-container
        fluid
      >
        <div class="page-title light-blue darken-3 white--text elevation-6 display-1">
          <v-icon large class="white--text">{{active_page.action}}</v-icon> {{active_page.title}}
        </div>
        <router-view></router-view>
      </v-container>
    </v-content>
    <v-footer
      color="blue-grey"
      app
    >
      <span class="white--text">SQAN is a service of the Indiana University Scalable Compute Archive (IU SCA) group.</span>
    </v-footer>
  </v-app>
</template>

<script>

  import Drawer from '@/components/Drawer.vue';

  export default {
    data: () => ({
      drawer: null,
      active_page: {
        action: 'mdi-microscope',
        title: 'Exams'
      }
    }),
    components: {Drawer},
    props: {
      source: String
    },
    methods: {
      updateActive: function(navItem) {
        this.active_page.action = navItem.action;
        this.active_page.title = navItem.title;
      }
    }
  }
</script>

<style>
  .page-title {
    padding-bottom: 7px;
    padding-left: 10px;
    padding-top: 7px;
    margin-left: -12px;
    margin-top: -12px;
    margin-bottom: 15px;
    max-width: 30%;
    border-bottom-right-radius: 20px;
  }
</style>
