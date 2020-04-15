<template>
  <v-app id="inspire">
      <Drawer @navChange="updateActive"></Drawer>

    <v-content>
      <v-container
        fluid
      >
        <div class="page-title light-blue darken-3 white--text elevation-6 display-1">
          <v-icon large class="white--text">{{active_page.action}}</v-icon>
          <v-divider
            vertical style="display: inline;"
            class="mx-2"
          ></v-divider>

          {{active_page.title}}
        </div>
        <transition name="fade">
          <router-view></router-view>
        </transition>
      </v-container>
    </v-content>
    <v-footer
      color="blue-grey"
      app
      padless
      class="text-right elevation-8"
    >
      <v-spacer></v-spacer>
      <div class="white--text float-right caption mx-2 mt-1">SQAN is a service of the Indiana University Scalable Compute Archive (IU SCA) group.</div>
    </v-footer>
  </v-app>
</template>

<script>

  import Drawer from '@/components/Drawer.vue';

  export default {
    data: () => ({
      active_page: {
        action: '',
        title: ''
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
    max-width: 50%;
    min-width: 300px;
    border-bottom-right-radius: 20px;
  }

  .fade-enter-active, .fade-leave-active {
    transition-property: opacity;
    transition-duration: .25s;
  }

  .fade-enter-active {
    transition-delay: .25s;
  }

  .fade-enter, .fade-leave-active {
    opacity: 0
  }
</style>
