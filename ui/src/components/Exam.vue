<template>
    <div class="exam" v-if="exam.series !== undefined">
      <div class="display-1 font-weight-medium">
        <v-icon large>mdi-account-check</v-icon>
        {{exam.exam.subject}}
        {{exam_id}}
      </div>
      <div class="subtitle-1">
        {{exam.exam.StudyTimestamp}}
      </div>
        <v-data-table
                dense
                disable-pagination
                hide-default-footer
                :items="exam.series"
                :headers="fields"
                @click:row="openSeries"
                v-if="!selected_series"
        >
          <template v-slot:item.qc1_state="{ item }">
            <SeriesStatus :series="item" />
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
    import SeriesStatus from "./exams/SeriesStatus";

    export default {
        name: 'Exam',
        components: {Series, SeriesStatus},
        props: {
            exam_id: String
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
                },  {
                  text: 'Series Number',
                  value: 'SeriesNumber'
                },  {
                  text: 'Image Count',
                  value: 'qc.series_image_count'
                }],
              selected_series: null
            }
        },
        methods: {
            getExam() {

                this.$http.get(`${this.$config.api}/exam/${this.exam_id}`)
                    .then(res => {
                        this.exam = res.data;
                        console.log(res.data);
                    }, err=> {
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
            }
        },
        mounted() {
            this.getExam();
            this.setupStream();
        },
        watch: {
            exam_id(newval) {
                console.log(newval);
                this.getExam();
            }
        }

    }
</script>

<style scoped>

</style>
