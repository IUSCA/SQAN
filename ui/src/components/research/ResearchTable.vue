<template>
  <div>

    <v-dialog
      v-model="research_exams_dialog"
      max-width="90%"
    >
      <ResearchExams :exams="selected.exams" :research="selected.research" v-if="selected" />
    </v-dialog>

    <v-data-table
      dense
      :items="filtered_results"
      :headers="fields"
      disable-pagination
      hide-default-footer
      @click:row="showResearch"
    >
      <template v-slot:item.lastUpdated="{ item }">
        {{item.lastUpdated | moment}}
      </template>
      <template v-slot:item.QCStatus="{ item }">
        <QCStatus :exams="item.exams"></QCStatus>
      </template>
    </v-data-table>

    <v-divider></v-divider>

    <div class="text-right my-2">
      <QCStatus :exam="{}" :show_legend="true"></QCStatus>
    </div>

  </div>
</template>

<script>

  import QCStatus from "../exams/QCStatus";
  import ResearchExams from "./ResearchExams";

  export default {
    name: 'ResearchTable',
    components: {QCStatus, ResearchExams},
    props: {
      results: Array
    },
    computed: {
      filtered_results() {
        let mapped = this.results.map(s => {
          s['subjectCount'] = [...new Set(s.exams.map( e => e.subject))].length;
          s['examCount'] = s.exams.length;
          s['lastUpdated'] = new Date(Math.max.apply(Math, s.exams.map(function(e) { return new Date(e.StudyTimestamp)})));

          let qc = {
            passed: 0,
            failed: 0
          };

          s.exams.map( e => {
            if(e.qc === undefined) return;
            if(e.qc.series_failed > 0) return qc.failed += 1;
            if(e.qc.series_passed > 0) return qc.passed += 1;
            return;
          });

          return s;
        });

        return mapped;
      }
    },
    methods: {
      showResearch(research) {
        this.selected = null;
        console.log(research);
        this.$nextTick(() => {
          this.selected = research;
          this.research_exams_dialog = true;
        })
      }
    },
    data() {
      return {
        research_exams_dialog: false,
        selected: null,
        fields: [
          {
            text: 'IIBISID',
            value: 'research.IIBISID',
            sortable: true
          },
          {
            text: 'Modality',
            value: 'research.Modality',
            sortable: true
          },
          {
            text: 'StationName',
            value: 'research.StationName',
            sortable: true
          },
          {
            text: '# of Subjects',
            value: 'subjectCount',
            sortable: true
          },
          {
            text: '# of Exams',
            value: 'examCount',
            sortable: true
          },
          {
            text: 'Last Exam',
            value: 'lastUpdated',
            sortable: true
          },
          {
            text: 'QC Status of Exams',
            value: 'QCStatus',
            sortable: false
          }
        ]
      }
    },
  }

</script>
