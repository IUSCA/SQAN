<template>
  <v-chip
    :color="status.bg"
    :text-color="status.text"
    class="font-weight-light elevation-2"
    x-small
    link
  >
    <v-icon small class="pr-2">{{status.icon}}</v-icon>
    {{series.qc1_state}}

  </v-chip>
</template>

<script>
  export default {
    name: 'SeriesStatus',
    props: {
      series: Object
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
          'missing': {
            bg: 'light-blue',
            text: 'black',
            icon: 'mdi-flask-empty-outline'
          },
          'notemplate': {
            bg: 'grey',
            text: 'black',
            icon: 'mdi-border-none-variant'
          },
          'success': {
            bg: 'light-green',
            text: 'black',
            icon: 'mdi-check-circle'
          },
          'reqc': {
            bg: 'light-grey',
            text: 'black',
            icon: 'mdi-refresh'
          },
          'noqc': {
            bg: 'light-grey',
            text: 'black',
            icon: 'mdi-ban'
          }
        }
      }
    },
    computed: {
      status: function() {
        if(this.series.qc1_state === 'missing') return this.statuses['missing'];
        if(this.series.qc1_state === 'no template') return this.statuses['notemplate'];
        if(this.series.qc1_state === 're-qcing') return this.statuses['reqc'];
        if(this.series.qc === undefined) return this.statuses['noqc'];
        if(this.series.qc.errors.length) return this.statuses['danger'];
        if(this.series.qc.warnings.length) return this.statuses['warning'];
        if(this.series.qc.missing_count) return this.statuses['missing'];
        return this.statuses['success'];
      },
    }
  }
</script>
