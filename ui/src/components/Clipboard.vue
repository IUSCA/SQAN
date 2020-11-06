<template>
  <span ref="container">
    <v-btn x-small @click="doCopy" color="blue lighten-3"><v-icon x-small class="mr-1">mdi-link-variant</v-icon> Copy Direct Link</v-btn>
  </span>
</template>

<script>
  export default {
    name: 'Clipboard',
    props: {
      message: String
    },
    computed: {
      msg_text() {
        return this.message;
      }
    },
    methods: {
      doCopy: function () {

        let self = this;
        let container = this.$refs.container;
        this.$copyText(this.msg_text, container).then(function (e) {
          console.log(self.msg_text);
          console.log(e)
        }, function (e) {
          console.log(e)
        })
      }
    },
    mounted() {
      console.log(this.message);
    }
  }
</script>
