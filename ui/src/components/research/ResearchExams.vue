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
      <v-icon large>mdi-microscope</v-icon>
      {{research.IIBISID}} - {{research.Modality}}
    </div>

    <v-divider></v-divider>
    <ReQC class="mx-1" :research="research"></ReQC>

    <v-col cols="3">
      <v-text-field
        v-model="filter"
        prepend-icon="mdi-filter"
        label="Subject"
        single-line
        hide-details
      ></v-text-field>
    </v-col>

    <v-data-table
      dense
      disable-pagination
      hide-default-footer
      :search="filter"
      :items="filter_exams"
      @click:row="showExam"
      :headers="fields"

    >
      <template v-slot:item.qc="{ item }">
        <QCStatus :exam="item"></QCStatus>
      </template>
    </v-data-table>

    <v-divider></v-divider>

    <div class="text-right my-2">
      <QCStatus :exam="{}" :show_legend="true"></QCStatus>
    </div>

  </v-card>
</template>

<script>

  import Exam from "../Exam";
  import QCStatus from "../exams/QCStatus";
  import ReQC from "../exams/ReQC";

  export default {
    name: 'ResearchExams',
    components: {Exam,QCStatus,ReQC},
    computed: {
      filter_exams() {
        return this.exams.filter(ex => {
          return ex.subject !== null
        })
      }
    },
    props: {
      research: Object,
      exams: Array,
    },
    data() {
      return {
        selected: null,
        exam_dialog: false,
        filter: '',
        fields: [{
          text: 'Subject',
          value: 'subject'
        }, {
          text: 'Date',
          value: 'StudyTimestamp',
          filterable: false,
        },  {
          text: 'QC Status (series)',
          value: 'qc',
          filterable: false,
          sortable: false
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
