<template>
  <v-chip color="green lighten-5" x-small>
    <v-avatar right>
      <v-icon x-small>{{icon}}</v-icon>
    </v-avatar>
    <span class="font-weight-light ml-1">
      {{tstring}}
    </span>
  </v-chip>
</template>

<script>
  export default {
    name: 'TemplateChip',
    props: {
      templates: Object,
      template_series: Object
    },
    computed: {
      icon() {

        if(this.templates === undefined || this.template_series === undefined) return '';
        let t = this.templates[this.template_series.exam_id];

        if(t === undefined) return 'mdi-question-circle';
        return t.converted_to_template ? 'mdi-file-multiple-outline' : 'mdi-file-multiple';
      },
      tstring() {
        if(this.templates === undefined || this.template_series === undefined) return 'nope';
        let t = this.templates[this.template_series.exam_id];
        if(t === undefined) return 'Template not found';
        let timestamp = this.$moment(t.StudyTimestamp).format('YYYY-MM-DD');
        return `${t.template_name} | ${timestamp} - (#${this.template_series.SeriesNumber})`;
      }
    },
    data() {
      return {};
    },
    methods: {

    },
  }
</script>
