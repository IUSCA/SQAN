<template>
  <v-snackbar v-model="show" top right :color="color">
    {{message}}
    <v-btn text color="accent" @click.native="show = false" :timeout="$store.state.timeout">x</v-btn>
  </v-snackbar>
</template>

<script>
  export default {
    data () {
      return {
        show: false,
        message: '',
        isError: false,
        color: 'accent'
      }
    },
    created: function () {
      this.$store.watch(state => state.snack, () => {
        const msg = this.$store.state.snack;
        if (msg !== '') {
          this.show = true;
          this.message = this.$store.state.snack;
          setTimeout(() => {
            this.$store.commit('setSnack', {
              msg: '',
              isError: false,
              timeout: 3000
            });
          }, this.$store.state.timeout)
        }
      });

      this.$store.watch(state => state.isError, () => {
        // console.log("STATE ISERROR IS CHANGING");
        this.isError = this.$store.state.isError
        this.color = this.isError ? 'red' : 'blue-grey';
      })
    }
  }
</script>
