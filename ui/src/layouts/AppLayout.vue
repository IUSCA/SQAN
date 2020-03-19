<template>
  <v-app id="inspire">
    <v-navigation-drawer
      v-model="drawer"
      permanent
      expand-on-hover
      app
    >
      <Drawer></Drawer>
    </v-navigation-drawer>

    <v-content>
      <v-container
        fluid
      >
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
      drawer: null
    }),
    components: {Drawer},
    props: {
      source: String
    }
  }
</script>
