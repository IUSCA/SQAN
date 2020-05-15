<template>
  <v-chip color="blue lighten-4" small>
    <v-avatar class="mr-2 my-1">
      <v-gravatar :email="user.email" />
    </v-avatar>
    {{user.fullname}}
  </v-chip>
</template>

<script>
  export default {
    name: 'Avatar',
    props: {
      user_id: String
    },
    data() {
      return {
        user: {}
      }
    },
    methods: {
      getUser() {
        let self = this;
        this.$http.get(`${this.$config.api}/user/${this.user_id}`)
        .then(res => {
          console.log(res.data);
          self.user = res.data;
        }, err => {
          console.log(err);
        })
      }
    },
    mounted() {
      this.getUser();
    }
  }
</script>
