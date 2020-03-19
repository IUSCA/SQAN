<template>
    <div class="exam" v-if="exam.series !== undefined">
      <div class="display-1 font-weight-medium">
        <v-icon large>mdi-account-check</v-icon>
        {{exam.exam.subject}}
      </div>
        <v-data-table
                hover
                :items="exam.series"
                :headers="fields"
                @click:row="openSeries"
                v-if="!selected_series"
        >
        </v-data-table>
        <Series :series_id="selected_series" v-if="selected_series">
            <template slot="close">
                <v-btn fab top right absolute @click="closeSeries" color="light-blue">
                  <v-icon>mdi-close</v-icon>
                </v-btn>
            </template>
        </Series>
    </div>
</template>

<script>

    import Series from '@/components/Series.vue';

    export default {
        name: 'Exam',
        components: {Series},
        props: {
            exam_id: String
        },
        data() {
            return {
                exam: {},
                fields: [{
                  text: 'Series Description',
                  value: 'series_desc'
                },  {
                  text: 'Series Number',
                  value: 'SeriesNumber'
                }, {
                  text: 'QC1 State',
                  value: 'qc1_state'
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
