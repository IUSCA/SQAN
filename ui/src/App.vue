<template>
  <v-app>
    <component v-bind:is="layout"></component>
  </v-app>
</template>

<script>
  import AppLayout from './layouts/AppLayout'
  import SimpleLayout from './layouts/SimpleLayout'
  export default {
    computed: {
      layout () {
        return this.$store.getters.layout
      }
    },
    components: {
      'app-layout': AppLayout,
      'simple-layout': SimpleLayout
      // define as many layouts you want for the application
    },
    methods: {
    }
  }
</script>

<style>
  .clickable {
    cursor: pointer;
  }

  .fade-enter-active,
  .fade-leave-active {
    transition-duration: 0.3s;
    transition-property: height, opacity;
    transition-timing-function: ease;
    overflow: hidden;
  }

  .fade-enter,
  .fade-leave-active {
    opacity: 0;
  }

</style>
