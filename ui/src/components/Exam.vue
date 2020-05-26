<template>
  <div class="exam pa-5" v-if="exam.series !== undefined">
    <v-btn
      class="float-right"
      x-small
      @click="toggleDeprecated"
      v-if="!selected_series"
    >
      <v-icon small v-if="deprecated === 'some'">mdi-eye-outline</v-icon>
      <v-icon small v-if="deprecated === 'none'">mdi-eye-off-outline</v-icon>
      <v-icon small v-if="deprecated === 'all'">mdi-eye-plus-outline</v-icon>
    </v-btn>
    <div class="display-1 font-weight-medium">
      <v-icon large>mdi-account-check</v-icon>
      {{exam.exam.subject}}
    </div>
    <div class="subtitle-1">
      <v-icon>mdi-flask</v-icon>
      {{exam.exam.research_id.IIBISID}} // {{exam.exam.research_id.Modality}} // {{exam.exam.research_id.StationName}}<br>
      <v-icon>mdi-clock</v-icon>
      {{exam.exam.StudyTimestamp | moment("MMM Do, YYYY hh:mm:ss")}}
    </div>
    <v-divider></v-divider>
    <v-divider></v-divider>
    <div v-if="!selected_series">
    <Clipboard :message="direct_link"></Clipboard>
    <ReQC class="mx-1" :exam="exam.exam"></ReQC>
    <SetAsTemplate class="mx-1" :exam="exam.exam" v-if="!exam.exam.converted_to_template"></SetAsTemplate>
    <v-btn x-small color="orange" v-if="exam.exam.converted_to_template">
      <v-icon x-small class="mr-1">mdi-checkbox-multiple-checked</v-icon>
      Marked As Template
    </v-btn>

    <DeleteExam class="float-right" :exam="exam.exam"></DeleteExam>
    </div>
    <v-divider class="my-1"></v-divider>
    <v-data-table
      dense
      bordered
      disable-pagination
      hide-default-footer
      :items="filtered_series"
      :headers="fields"
      @click:row="openSeries"
    >
      <template v-slot:item.qc1_state="{ item }">
        <span v-if="item.deprecated_by === null || deprecated === 'all'">
          <SeriesStatus :series="item" :key="componentKey"/>
        </span>
      </template>

      <template v-slot:item.qc.template_id="{ item }">
        <span v-if="item.qc !== undefined && templates && (item.deprecated_by === null || deprecated === 'all')">
          <TemplateChip :templates="templates" :template_series="template_series[item.qc.template_id]" :key="componentKey"></TemplateChip>
        </span>
      </template>
    </v-data-table>

    <v-dialog
      v-model="series_dialog"
      max-width="90%"
    >
      <Series :series_id="selected_series" v-if="selected_series">
    </Series>
    </v-dialog>
  </div>
</template>

<script>

  import Series from '@/components/Series.vue';
  import SeriesStatus from "@/components/exams/SeriesStatus";
  import SetAsTemplate from "./exams/SetAsTemplate";
  import ReQC from "./exams/ReQC";
  import DeleteExam from "./exams/DeleteExam";
  import TemplateChip from "./exams/TemplateChip";
  import Clipboard from "./Clipboard";

  export default {
    name: 'Exam',
    components: {Series, SeriesStatus, SetAsTemplate, ReQC, DeleteExam, TemplateChip, Clipboard},
    props: {
      exam_id: String
    },
    computed: {
      direct_link() {
        return `${window.location.origin}/exams?exam=${this.exam_id}`;
      },
      filtered_series() {
        let series = [];

        if(this.deprecated !== 'none') {
          series = this.exam.series;
        } else {
          series = this.exam.series.filter(s => {
            return s.deprecated_by === null;
          });
        }

        if(this.exam.exam.qc.series_missing.length) {
          this.exam.exam.qc.series_missing.forEach(m => {
            series.push({series_desc: m, qc1_state: 'missing', deprecated_by: null})
          })
        }
        return series;
      }
    },
    data() {
      return {
        series_dialog: false,
        es: null,
        componentKey: 0,
        exam: {},
        templates: {},
        template_series: {},
        fields: [{
          text: 'Series Description',
          value: 'series_desc'
        }, {
          text: 'QC1 State',
          value: 'qc1_state'
        }, {
          text: 'Series Number',
          value: 'SeriesNumber'
        }, {
          text: 'Image Count',
          value: 'qc.series_image_count'
        }, {
          text: 'Template Used',
          value: 'qc.template_id'
        }],
        selected_series: null,
        deprecated: 'some',
        deprecated_options: ['some', 'all', 'none']
      }
    },
    methods: {
      getExam() {
        this.exam = {};
        this.$http.get(`${this.$config.api}/exam/${this.exam_id}`)
          .then(res => {
            this.exam = res.data;
            console.log('EXAM DATA');
            console.log(res.data.series);
            console.log(res.data);
            this.getTemplates();
          }, err => {
            console.log(err);
          });

      },
      getTemplates() {
        let self = this;
        this.$http.get(`${this.$config.api}/research/templates/${this.exam.exam.research_id._id}`)
          .then(res => {
            res.data.forEach( t => {
              self.$set(self.templates, t.template._id, t.template);
              t.series.forEach(ts => {
                self.$set(self.template_series, ts._id, ts);
              });
            });
            console.log('TEMPLATE DATA');
            console.log(res.data);
          }, err => {
            console.log(err);
          });
      },

      setupStream() {
        // Not a real URL, just using for demo purposes
        console.log(`Creating event stream for id ${this.exam_id}`);

        this.es.addEventListener(this.exam_id, event => {
          console.log(`Event received! ${event.data}`);
          let evt = JSON.parse(event.data);
          if(evt.status.includes('qc')) {
            console.log('reqc event detected, reloading exam page');
            this.getExam()
          }
        }, false);

        this.es.addEventListener('error', event => {
          if (event.readyState == EventSource.CLOSED) {
            console.log('Event was closed');
          }
        }, false);
      },

      openSeries(record) {
        this.selected_series = record._id;
        this.series_dialog = true;
        console.log(record);
      },
      closeSeries() {
        this.selected_series = null;
      },
      toggleDeprecated() {
        let idx = this.deprecated_options.indexOf(this.deprecated);
        let new_idx = idx + 1 >= this.deprecated_options.length ? 0 : idx + 1;
        this.deprecated = this.deprecated_options[new_idx];
        this.forceReRender();
      },
      forceReRender() {
        this.componentKey += 1;
      }
    },
    mounted() {
      this.getExam();
      this.es = new EventSource(`${this.$config.api}/event/exams`),
      this.setupStream();
    },
    watch: {
      exam_id(newval) {
        console.log(newval);
        this.selected_series = null;
        this.es.close();
        this.es = new EventSource(`${this.$config.api}/event/exams`);
        console.log(this.es);
        this.getExam();
        this.setupStream();
      }
    }

  }
</script>

<style scoped>

</style>
