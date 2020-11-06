<template>

  <v-chip
    :color="status.bg"
    :text-color="status.text"
    class="ma-1 font-weight-light elevation-5"
    small
  >
    <v-icon small class="pr-2">{{status.icon}}</v-icon>
    {{series.series_number}} - {{series.series_name}}  <strong class="mx-2">(<span v-if="received === undefined">0</span>{{received}}/{{series.image_count}})</strong>

  </v-chip>

</template>

<script>

  export default {
    name: 'seriesBlock',
    props: {
      series: Object,
      received: Number
    },
    data() {
      return {
        statuses: {
          'danger': {
            bg: 'red darken-3',
            text: 'white',
            icon: 'mdi-alert-circle'
          },
          'warning': {
            bg: 'orange',
            text: 'black',
            icon: 'mdi-alert-outline'
          },
          'success': {
            bg: 'green darken-3',
            text: 'white',
            icon: 'mdi-check-circle'
          }
        }
      }
    },
    computed: {
      status: function() {
        if(this.received === undefined) return this.statuses['warning'];
        if(this.received < this.series.image_count) return this.statuses['danger'];
        return this.statuses['success'];
      }
    }

  }
</script>
