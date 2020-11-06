<template>
  <v-card>
    <v-card-title>{{exam.subject}}</v-card-title>
  </v-card>
</template>

<script>

  export default {
    name: 'ExamCard',
    props: {
      exam: Object
    }
  }
</script>

<style>

</style>
