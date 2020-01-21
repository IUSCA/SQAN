<template>
    <div class="exam" v-if="exam.series !== undefined">
        <h4>{{exam.exam.subject}}</h4>
        <b-table
                hover
                :items="exam.series"
                :fields="fields"
                @row-clicked="openSeries"
                v-if="!selected_series"
        >
        </b-table>
        <Series :series_id="selected_series" v-if="selected_series">
            <template slot="close">
                <b-button class="float-right" @click="closeSeries" variant="info">Go Back</b-button>
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
                fields: ['series_desc', 'SeriesNumber', 'qc1_state'],
                selected_series: null,
            }
        },
        methods: {
            getExam() {

                this.$http.get(`/api/qc/exam/${this.exam_id}`)
                    .then(res => {
                        this.exam = res.data;
                        console.log(res.data);
                    }, err=> {
                        console.log(err);
                    });

            },
            openSeries(record, index) {
                this.selected_series = record._id;
                console.log(record);
                console.log(index);
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
