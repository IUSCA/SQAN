<template>
  <v-app id="inspire">
      <Drawer @navChange="updateActive"></Drawer>

    <v-content>
      <v-container
        fluid
        class="main mb-4"
      >
        <div class="page-title light-blue darken-3 white--text elevation-6 display-1">
          <v-icon large class="white--text pb-2 ml-1">{{active_page.action}}</v-icon>
          <v-divider
            vertical style="display: inline;"
            light
            class="mx-3"
          ></v-divider>


          <span class="font-weight-light">{{active_page.title}}</span>
        </div>
        <transition name="fade">
          <keep-alive>
            <router-view></router-view>
          </keep-alive>
        </transition>
        <div
          class="light-blue darken-3 white--text text-right page-footer"
        >
          <v-spacer></v-spacer>
          <div class="float-right caption mx-2 mt-1">SQAN is a service of the Indiana University Scalable Compute Archive (IU SCA) group.</div>
        </div>
      </v-container>

    </v-content>
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
    margin-top: 0px;
    margin-bottom: 15px;
    max-width: 50%;
    min-width: 350px;
    border-bottom-left-radius: 20px;
    position: absolute;
    top: 0px;
    right: 0px;
  }

  .page-footer {
    position: absolute;
    bottom: 0px;
    margin-top: 20px;
    width: 100%;
    right: 0px;
    z-index: 200;
  }

  .main {
    margin-top: 60px;
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
