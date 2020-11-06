<template>
  <v-card class="elevation-6" shaped>

    <v-dialog
      v-model="research_dialog"
      max-width="500"
    >
      <ResearchDetail :research_id="research.IIBISID" v-if="research" />
    </v-dialog>

    <v-dialog
      v-model="research_exams_dialog"
      max-width="90%"
    >
      <ResearchExams :exams="exams" :research="research" v-if="exams" />
    </v-dialog>

    <v-toolbar
      color="blue-grey lighten-3"
      class="mb-3"
    >
      <v-icon class="mr-2">mdi-microscope</v-icon>
      <v-toolbar-title @click="openDetails">{{research.IIBISID}} / {{research.Modality}}</v-toolbar-title>
    </v-toolbar>

    <v-divider></v-divider>

    <v-row class="text-center" @click="openResearchExams">
      <v-col cols="6" class="text-center">
        <v-icon large color="orange darken-2">mdi-face-recognition</v-icon><br>
        <span class="title">{{subjectList.length}} subjects</span>
      </v-col>
      <v-col cols="6" class="text-center">
        <v-icon large color="blue darken-2">mdi-microscope</v-icon><br>
        <span class="title">{{exams.length}} exams</span>
      </v-col>
      <v-col cols="6" class="text-center">
        <v-icon large color="green darken-2">mdi-check-circle</v-icon><br>
        <span class="title">{{qcCounts.passed}} passed</span>
      </v-col>
      <v-col cols="6" class="text-center">
        <v-icon large color="red darken-2">mdi-alert-circle</v-icon><br>
        <span class="title">{{qcCounts.failed}} failed</span>
      </v-col>
    </v-row>

    <v-divider></v-divider>

    <v-footer>
      <v-icon class="mr-1">mdi-clock</v-icon> Last Updated: {{lastUpdate | moment("from")}}
    </v-footer>

  </v-card>
</template>

<script>

  import ResearchDetail from "./ResearchDetail"
  import ResearchExams from "./ResearchExams";

  export default {
    name: 'ResearchCard',
    components: {ResearchDetail, ResearchExams},
    props: {
      research: Object,
      exams: Array
    },
    data() {
      return {
        research_dialog: false,
        research_exams_dialog: false
      }
    },
    computed: {
      lastUpdate() {
        return new Date(Math.max.apply(Math, this.exams.map(function(e) { return new Date(e.StudyTimestamp)})));
      },
      subjectList() {
        return [...new Set(this.exams.map( e => e.subject))];
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
      openDetails() {
        this.research_dialog = true;
      },
      openResearchExams() {
        this.research_exams_dialog = true;
      }
    }
  }
</script>

<style>

</style>
