<template>
  <v-container
    class="fill-height"
    id="signout"
    fluid
  >
    <v-card
      class="mx-auto my-5 pa-4 text-center elevation-8"
      outlined

    >
      <div class="display-2 ma-3">Logging you out</div>

      <v-progress-circular
        :size="50"
        class="text-center"
        color="primary"
        indeterminate
      ></v-progress-circular>
    </v-card>
  </v-container>

</template>

<script>
export default {
  name: "signout",
  mounted() {
    let self = this;
    setTimeout(() => {
      self.$router.push({ path: "/" });
    }, 800);
  }
};
</script>

<style>
  #signout {
    background-color: #5cadde;
    height: 100vh;
    background-position: center;
    background-repeat: no-repeat;
    background-size: cover;
    position: relative;
  }
</style>
