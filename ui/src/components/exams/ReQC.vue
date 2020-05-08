<template>
  <span>
    <v-snackbar
      v-model="snackbar"
      top
      right
      :timeout="timeout"
    >
      {{status}}
      <v-btn
        color="red"
        text
        @click="snackbar = false"
      >
        Close
      </v-btn>
    </v-snackbar>
     <v-dialog
       v-model="req_dialog"
       max-width="500"
     >
    <template v-slot:activator="{ on }">
      <v-btn
        color="orange lighten-2"
        dark
        x-small
        v-on="on"
      >
        <v-icon x-small class="mr-1">mdi-recycle</v-icon> Rerun QC
      </v-btn>
    </template>

    <v-form
      ref="form"
    >
    <v-card>
      <v-card-title class="orange lighten-2">
        <v-icon class="mr-1">mdi-recycle</v-icon> Confirm Re-running QC Operations
      </v-card-title>
      <v-divider></v-divider>
      <v-card-text>
          <v-text-field
            v-model="exam.subject"
            label="Subject"
            prepend-icon="mdi-account"
            required
            disabled
          ></v-text-field>

          <v-text-field
            v-model="exam.StudyTimestamp"
            label="Timestamp"
            prepend-icon="mdi-clock"
            required
            disabled
          ></v-text-field>

          <v-select
            v-if="series !== undefined"
            :items="template_options"
            v-model="override"
            label="Template Override"
            prepend-icon="mdi-checkbox-multiple-blank"
            required
          ></v-select>

          <v-switch v-model="failures" class="mx-2" label="Only Re-run QC Failures "></v-switch>
      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          @click="confirmReQC"
        >
          Confirm
        </v-btn>
      </v-card-actions>

    </v-card>
    </v-form>
  </v-dialog>
  </span>
</template>

<script>

  export default {
    name: 'ReQC',
    props: {
      exam: Object,
      exams: Array,
      series: Object,
    },
    data() {
      return {
        req_dialog: false,
        snackbar: false,
        status: '',
        timeout: 5000,
        override: '',
        failures: false,
        templates: []
      }
    },
    computed: {
      template_options() {
        return this.templates.map(t => {
          return {
            text: `${t.template.StudyTimestamp} - (${t.series.length})`,
            value: t._id
          }
        })
      }
    },
    methods: {
      confirmReQC() {
        this.req_dialog = false;
        this.status = "Processing ...";
        this.snackbar = true;
        let self = this;
        this.$http.post(`${this.$config.api}/exam/reqc/${this.exam._id}`, { comment: this.comment})
          .then(res => {
            self.snackbar = false;
            self.status = res.data.message;
            self.snackbar = true;
          }, err=> {
            self.snackbar = false;
            self.status = 'Error marking exam as template!';
            self.snackbar = true;
            console.log(err);
          });
      },
      getTemplates() {
        let self = this;
        this.$http.get(`${this.$config.api}/research/templates/${this.exam.research_id._id}`, { comment: this.comment})
          .then(res => {
            console.log(res.data);
            self.templates = res.data;
          }, err=> {
            console.log(err);
          });

      }
    },
    mounted() {
      console.log(this.series);
      this.getTemplates();
    }
  }
</script>
