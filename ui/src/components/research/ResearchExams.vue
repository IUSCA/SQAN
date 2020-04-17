<template>
  <v-card class="exam pa-5">

    <v-dialog
      v-model="exam_dialog"
      max-width="90%"
    >
      <v-card>
        <Exam :exam_id="selected" v-if="selected" />
      </v-card>
    </v-dialog>


    <div class="display-1 font-weight-medium">
      <v-icon large>mdi-account-check</v-icon>
      {{research.IIBISID}} - {{research.Modality}}
    </div>

    <v-data-table
      dense
      disable-pagination
      hide-default-footer
      :items="exams"
      @click:row="showExam"
      :headers="fields"

    >
    </v-data-table>

  </v-card>
</template>

<script>

  import Exam from "../Exam";

  export default {
    name: 'ResearchExams',
    components: {Exam},
    props: {
      research: Object,
      exams: Array,
    },
    data() {
      return {
        selected: null,
        exam_dialog: false,
        fields: [{
          text: 'Subject',
          value: 'subject'
        }, {
          text: 'Date',
          value: 'StudyTimestamp'
        },  {
          text: 'Passed',
          value: 'qc.series_passed'
        },  {
          text: 'Failed',
          value: 'qc.series_failed'
        }],
        selected_series: null
      }
    },
    methods: {
      showExam(exam) {
        console.log(exam);
        this.selected = exam._id;
        this.exam_dialog = true;
      }
    },
    mounted() {

    },
    watch: {

    }

  }
</script>

<style scoped>

</style>
