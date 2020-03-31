<template>
  <v-card class="elevation-6" shaped>
    <v-toolbar
      color="brown lighten-3"
      class="mb-3"
    >
      <v-icon class="mr-2">mdi-account-circle</v-icon>
      <v-toolbar-title>{{subject.subject}}</v-toolbar-title>
    </v-toolbar>

    <v-divider></v-divider>

    <div class="headline">Exams</div>
    <div class="ml-2 mr-2 mb-3 mt-3">
      <span v-for="exam in subject.exams" :key="exam._id">
      <SubjectBlock :subject="exam" v-if="exam.qc !== undefined"></SubjectBlock>
    </span>
    </div>


    <v-divider></v-divider>

    <v-footer>
      <v-icon class="mr-1">mdi-clock</v-icon> Last Updated: {{lastUpdate | moment("from")}}
    </v-footer>

  </v-card>
</template>

<script>

  import SubjectBlock from "../SubjectBlock";

  export default {
    name: 'SubjectCard',
    components: {SubjectBlock},
    props: {
      subject: Object
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
    }
  }
</script>

<style>

</style>
