<template>
  <div>

    <v-dialog
      v-model="exam_dialog"
      max-width="90%"
    >
      <v-card>
        <Exam :exam_id="selected" v-if="selected" />
      </v-card>
    </v-dialog>

    <v-data-table
      dense
      :items="filtered_results"
      :headers="fields"
      disable-pagination
      hide-default-footer
    >
      <template v-slot:item.lastUpdated="{ item }">
        {{item.lastUpdated | moment}}
      </template>
      <template v-slot:item.exams="{ item }">
        <span v-for="exam in item.exams" :key="exam._id" @click="showExam(exam)">
          <SubjectBlock :subject="exam" v-if="exam.qc !== undefined"></SubjectBlock>
        </span>
      </template>
    </v-data-table>
  </div>
</template>

<script>

  import SubjectBlock from "../SubjectBlock";
  import Exam from "../Exam";

  export default {
    name: 'SubjectTable',
    components: {SubjectBlock, Exam},
    props: {
      results: Object
    },
    computed: {
      filtered_results() {
        console.log('calling filtered');
        let arr = Object.keys(this.results).map((k) => this.results[k]);
        let mapped = arr.map(s => {
          s['lastUpdated'] = new Date(Math.max.apply(Math, s.exams.map(function(e) { return new Date(e.StudyTimestamp)})));

          let iibisids = [];

          s.exams.map( e => {
            if(iibisids.includes(e.research_id.IIBISID)) return;
            iibisids.push(e.research_id.IIBISID);
            return;
          });

          s['iibisids'] = iibisids;
          return s;
        });

        console.log(mapped);
        return mapped;
      }
    },
    methods: {
      showExam(exam) {
        console.log(exam);
        this.selected = exam._id;
        this.exam_dialog = true;
      }
    },
    data() {
      return {
        selected: null,
        exam_dialog: false,
        fields: [
          {
            text: 'Subject',
            value: 'subject',
            sortable: true
          },
          {
            text: 'IIBISIDs',
            value: 'iibisids',
            sortable: true
          },
          {
            text: 'Last Exam',
            value: 'lastUpdated',
            sortable: true
          },
          {
            text: 'Exams',
            value: 'exams',
            sortable: false
          }
        ]
      }
    },
  }

</script>
