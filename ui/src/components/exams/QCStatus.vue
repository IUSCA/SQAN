<template>
  <span>
    <span v-for="(format, stat) in statuses" :key="stat">
      <v-chip
        class="mr-1"
        :color="format.bg"
        :text-color="format.text"
        x-small
      >
          {{qcStats[stat]}}
      </v-chip>
    </span>
  </span>
</template>

<script>
  export default {
    name: 'QCStatus',
    props: {
      exam: Object,
      exams: Array,
      show_legend: {
        type: Boolean,
        default: false
      }
    },
    data() {
      return {
        statuses: {

          'passed': {
            bg: 'light-green',
            text: 'black',
            icon: 'mdi-check-circle'
          },
          'failed': {
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
          }
        }
      }
    },
    computed: {
      qcStats() {
        if(this.show_legend) {
          return {
            passed: 'passed',
            failed: 'failed',
            notemplate: 'no template',
            missing: 'missing',
            warning: 'warning',
          }
        }
        let qc = {
          passed: 0,
          failed: 0,
          notemplate: 0,
          missing: 0,
          warning: 0,
        };

        if(this.exam !== undefined) {
          if(this.exam.qc === undefined) return qc;

          qc.passed = this.exam.qc.series_passed;
          qc.failed = this.exam.qc.series_failed;
          qc.notemplate = this.exam.qc.series_no_template.length;
          qc.missing = this.exam.qc.series_missing.length;
          qc.warning = this.exam.qc.series_passed_warning;
        }

        if(this.exams !== undefined) {
          this.exams.map( e => {
            if(e.qc === undefined) return;
            if(e.qc.series_failed > 0) return qc.failed += 1;
            if(e.qc.series_missing.length) return qc.missing += 1;
            if(e.qc.series_no_template.length) return qc.notemplate += 1;
            if(e.qc.series_passed_warning > 0) return qc.warning += 1;
            if(e.qc.series_passed > 0) return qc.passed += 1;
            return;
          });
        }

        return qc;
      }
    }
  }
</script>

<style>

</style>
