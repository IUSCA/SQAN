<template>
  <v-chip label outlined small v-if="template.template !== undefined">
    {{template.template.series_desc}}
    <span class="font-italic font-weight-light ml-3">
      {{template.template.template_name}} | {{template.template.exam_id.StudyTimestamp | moment("YYYY-MM-DD")}}
    </span>
  </v-chip>
</template>

<script>
  export default {
    name: 'TemplateBadge',
    props: {
      id: String
    },
    data() {
      return {
        template: {}
      }
    },
    methods: {
      getTemplate() {
        let self = this;
        this.$http.get(`${this.$config.api}/template/head/${this.id}`)
          .then(res => {
            console.log(res.data);
            self.template = res.data;
          }, err => {
            console.log(err);
          })
      }
    },
    mounted() {
      this.getTemplate();
    }
  }
</script>
