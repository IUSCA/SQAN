<template>
  <span>

     <v-dialog
       v-model="req_dialog"
       max-width="500"
     >
    <template v-slot:activator="{ on }" v-if="$store.getters.hasRole('admin')">
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
      ref="form" v-model="isFormValid"
    >
    <v-card>
      <v-card-title class="orange lighten-2">
        <v-icon class="mr-1">mdi-recycle</v-icon> Confirm Re-running QC Operations
      </v-card-title>
      <v-divider></v-divider>

      <v-card-text>

          <v-text-field
            v-if="mode === 'research'"
            v-model="research.IIBISID"
            label="Research"
            prepend-icon="mdi-flask"
            disabled
          ></v-text-field>

          <v-text-field
            v-if="mode !== 'research'"
            v-model="exam.subject"
            label="Subject"
            prepend-icon="mdi-account"
            disabled
          ></v-text-field>

          <v-text-field
            v-if="mode !== 'research'"
            v-model="exam.StudyTimestamp"
            label="Timestamp"
            prepend-icon="mdi-clock"
            disabled
          ></v-text-field>

          <v-select
            :items="template_options"
            v-model="override"
            label="Template"
            prepend-icon="mdi-checkbox-multiple-blank"
            :rules="[(v) => !!v || 'You must select a template']"
            required
          ></v-select>

          <v-switch v-model="failures" class="mx-2" label="Only Re-run QC Failures " v-if="mode !== 'series'"></v-switch>
      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          @click="confirmReQC"
          :disabled="!isFormValid"
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
      research: Object,
      series: Object,
    },
    data() {
      return {
        isFormValid: false,
        req_dialog: false,
        override: null,
        failures: false,
        templates: []
      }
    },
    computed: {
      mode() {
        if(this.series !== undefined) return 'series';
        if(this.research !== undefined) return 'research';
        return 'exam';
      },
      template_options() {

        if(this.mode === 'series') { //filter out templates that don't include this series

          let options = [];
          this.templates.map(t => {
            t.series.map(ts => {
              if(ts.series_desc == this.series.series_desc) {
                let option = {
                  text: `${t.template.StudyTimestamp} - (#${ts.SeriesNumber})`,
                  value: ts._id
                }
                options.push(option);
              }
            });
          });
          return options;
        } else return this.templates.map(t => {

          return {
            text: `${t.template.StudyTimestamp} - (${t.series.length})`,
            value: t.template._id
          }
        })
      }
    },
    methods: {
      confirmReQC() {

        this.req_dialog = false;
        let self = this;
        let url = '';
        let data = {
          template_id: this.override
        };
        let qcmode = this.failures ? 'failed' : 'all';

        if(this.mode === 'research') {
          url = `${this.$config.api}/research/reqc/${qcmode}/${this.research._id}`;
        }

        if(this.mode === 'exam' && qcmode == 'all') {
          url = `${this.$config.api}/series/reqcallseries/${this.exam._id}`;
        }

        if(this.mode === 'exam' && qcmode == 'failed') {
          url = `${this.$config.api}/series/reqcerroredseries/${this.exam._id}`;
        }

        if(this.mode === 'series') {
          url = `${this.$config.api}/series/template/${this.series._id}`;
        }

        self.$store.dispatch('snack', 'Submitted ReQC Request');

        this.$http.post(url, data)
          .then(res => {
            self.$store.dispatch('snack', res.data.message);
            self.$emit('reqc');
          }, err=> {
            self.$store.dispatch('snack', 'Error submitting ReQC!');
            console.log(err);
          });
      },

      getTemplates() {
        let self = this;
        let research_id = '';
        if(this.mode === 'research') {
          research_id = this.research._id;
        }

        if(this.mode === 'exam') {
          research_id = this.exam.research_id._id;
        }

        if(this.mode === 'series') {
          research_id = this.series.exam_id.research_id._id;
        }

        this.$http.get(`${this.$config.api}/research/templates/${research_id}`)
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
