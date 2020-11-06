<template>
  <v-snackbar v-model="show" top right>
    {{message}}
    <v-btn text color="accent" @click.native="show = false" timeout=3000>x</v-btn>
  </v-snackbar>
</template>

<script>
  export default {
    data () {
      return {
        show: false,
        message: ''
      }
    },
    created: function () {
      this.$store.watch(state => state.snack, () => {
        const msg = this.$store.state.snack;
        if (msg !== '') {
          this.show = true;
          this.message = this.$store.state.snack;
          this.$store.commit('setSnack', '')
        }
      })
    }
  }
</script>
