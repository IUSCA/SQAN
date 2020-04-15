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
      2018-00072 // MR // AWP66027 <br>
      <v-icon>mdi-clock</v-icon>
      {{exam.exam.StudyTimestamp | moment("MMM Do, YYYY hh:mm:ss")}}
    </div>
    <v-divider></v-divider>
    <v-divider></v-divider>
    <div v-if="!selected_series">
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
      v-if="!selected_series"
    >
      <template v-slot:item.qc1_state="{ item }">
        <span v-if="item.deprecated_by === null || deprecated === 'all'">
          <SeriesStatus :series="item"/>
        </span>
      </template>
    </v-data-table>
    <Series :series_id="selected_series" v-if="selected_series">
      <template slot="close">
        <v-btn small fab top right absolute @click="closeSeries" color="light-blue">
          <v-icon small>mdi-close</v-icon>
        </v-btn>
      </template>
    </Series>
  </div>
</template>

<script>

  import Series from '@/components/Series.vue';
  import SeriesStatus from "@/components/exams/SeriesStatus";
  import SetAsTemplate from "./exams/SetAsTemplate";
  import ReQC from "./exams/ReQC";
  import DeleteExam from "./exams/DeleteExam";

  export default {
    name: 'Exam',
    components: {Series, SeriesStatus, SetAsTemplate, ReQC, DeleteExam},
    props: {
      exam_id: String
    },
    computed: {
      filtered_series() {
        if(this.deprecated !== 'none') return this.exam.series;
        return this.exam.series.filter(s => {
          return s.deprecated_by === null;
        })
      }
    },
    data() {
      return {
        exam: {},
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
        }],
        selected_series: null,
        deprecated: 'some',
        deprecated_options: ['some', 'all', 'none']
      }
    },
    methods: {
      getExam() {

        this.$http.get(`${this.$config.api}/exam/${this.exam_id}`)
          .then(res => {
            this.exam = res.data;
            console.log('EXAM DATA');
            console.log(res.data.series);
            console.log(res.data);
          }, err => {
            console.log(err);
          });

      },
      setupStream() {
        // Not a real URL, just using for demo purposes
        let es = new EventSource(`${this.$config.api}/event/exams`);

        es.addEventListener(this.exam_id, event => {
          console.log(`Event received! ${event.data}`);
        }, false);

        es.addEventListener('error', event => {
          if (event.readyState == EventSource.CLOSED) {
            console.log('Event was closed');
          }
        }, false);
      },
      openSeries(record) {
        this.selected_series = record._id;
        console.log(record);
      },
      closeSeries() {
        this.selected_series = null;
      },
      toggleDeprecated() {
        let idx = this.deprecated_options.indexOf(this.deprecated);
        let new_idx = idx + 1 >= this.deprecated_options.length ? 0 : idx + 1;
        this.deprecated = this.deprecated_options[new_idx];
      }
    },
    mounted() {
      this.getExam();
      this.setupStream();
    },
    watch: {
      exam_id(newval) {
        console.log(newval);
        this.selected_series = null;
        this.getExam();
      }
    }

  }
</script>

<style scoped>

</style>
