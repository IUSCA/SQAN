<template>
  <v-card class="elevation-6" shaped>

    <v-dialog
      v-model="exam_dialog"
      max-width="90%"
    >
      <v-card>
        <Exam :exam_id="selected" v-if="selected" />
      </v-card>
    </v-dialog>

    <v-toolbar
      color="brown lighten-3"
      class="mb-3"
    >
      <v-icon class="mr-2">mdi-account-circle</v-icon>
      <v-toolbar-title>{{subject.subject}}</v-toolbar-title>
    </v-toolbar>

    <v-divider></v-divider>

    <div class="headline">Exams</div>
    <div class="ma-2">
      <span v-for="exam in subject.exams" :key="exam._id" @click="showExam(exam)">
      <SubjectBlock :subject="exam" v-if="exam.qc !== undefined"></SubjectBlock>
    </span>
    </div>


    <v-divider></v-divider>

    <v-footer>
      <v-icon class="mr-1" small>mdi-clock</v-icon> Last Updated: {{lastUpdate | moment("from")}}
    </v-footer>

  </v-card>
</template>

<script>

  import SubjectBlock from "../SubjectBlock";
  import Exam from "../Exam";

  export default {
    name: 'SubjectCard',
    components: {SubjectBlock, Exam},
    props: {
      subject: Object
    },
    data() {
      return {
        selected: null,
        exam_dialog: false
      }
    },
    computed: {
      lastUpdate() {
        return new Date(Math.max.apply(Math, this.subject.exams.map(function(e) { return new Date(e.StudyTimestamp)})));
      },
      qcCounts() {
        let qc = {
          passed: 0,
          failed: 0
        };

        this.exams.map( e => {
          if(e.qc === undefined) return;
          if(e.qc.series_failed > 0) return qc.failed += 1;
          if(e.qc.series_passed > 0) return qc.passed += 1;
          return;
        });

        return qc;


      }
    },
    methods: {
      showExam(exam) {
        console.log(exam);
        this.selected = exam._id;
        this.exam_dialog = true;
      }
    }
  }
</script>

<style>

</style>
