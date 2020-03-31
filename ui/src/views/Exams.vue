<template>
    <div style="display: inline-flex; width: 100%">
      <v-dialog
        v-model="dialog"
        max-width="500"
      >
        <ResearchDetail :research_id="research_id" v-if="research_id" />
      </v-dialog>

      <v-container fluid>
          <v-text-field row
            v-model="search"
            append-icon="mdi-magnify"
            label="Search"
            single-line
            hide-details
            class="mx-5 my-5"
            @change="query"
          ></v-text-field>
          <v-radio-group v-model="search_type" row @change="updateQuery">
            <v-radio label="Research" value="research"></v-radio>
            <v-radio label="Subject" value="subject"></v-radio>
            <v-radio label="Calendar" value="calendar"></v-radio>
          </v-radio-group>
        <hr>
        <v-row dense v-if="search_type === 'research'">
          <v-col
            v-for="res in results"
            :key="res.research._id"
            :cols="4"
          >
            <ResearchCard class="ma-2" :research="res.research" :exams="res.exams"></ResearchCard>
          </v-col>
        </v-row>
        <v-row dense v-if="search_type === 'subject'">
          <v-col
            v-for="res in results"
            :key="res.subject"
            :cols="4"
          >
            <SubjectCard :subject="res"></SubjectCard>
          </v-col>
        </v-row>
        <div v-if="search_type === 'calendar' && calendarData.length">
          <v-calendar
            :events="calendarData"
            start="2020-01-01"
            :event-color="examColor"
            event-ripple
          >

          </v-calendar>
        </div>
      </v-container>

    </div>
</template>

<script>
// import SubjectBlock from "@/components/SubjectBlock.vue";
import ResearchCard from "../components/research/ResearchCard";
import SubjectCard from "../components/research/SubjectCard";
// import Exam from "@/components/Exam.vue";
import ResearchDetail from "../components/research/ResearchDetail";

export default {
  name: "exams",
  components: {SubjectCard, ResearchCard, ResearchDetail },
  computed: {
    calendarData() {
      if(this.search_type !== 'calendar') return [];

      let cD = this.results.map( e => {
        e.start = this.$moment(e.StudyTimestamp).add(5, 'hours').format('YYYY-MM-DD HH:ss');
        e.name = `${e.subject}`;
        console.log(e.start);
        return e;
      });
      console.log(cD);
      return cD;
    }
  },
  data() {
    return {
      ranges: {
        30: "30 days",
        60: "60 days",
        90: "90 days",
        all: "All Time"
      },

      sortoptions: {
        dateup: "Newest",
        datedown: "Oldest",
        iibis: "IIBISID"
      },

      subj_sortoptions: {
        "-StudyTimestamp": "Exam Date",
        subject: "Subject ID"
      },
      selected: null,
      loading_series: false,
      results: [],
      search: '',
      research_id: null,
      dialog: false,
      search_type: 'research'
    };
  },
  methods: {
    selectExam(_id) {
      this.selected = _id;
      console.log(this.selected);
    },
    showDetails: function(iibis) {
      this.research_id = null;
      this.$nextTick(function() {
        this.research_id = iibis;
        this.dialog = true;
      })

    },
    updateQuery: function() {
      this.results = [];
      this.$nextTick(function() {
        this.query();
      })
    },
    examColor: function(exam) {
      if(exam.qc === undefined) return 'grey';
      if(exam.qc.series_failed) return 'red';
      if(exam.qc.series_passed_warning) return 'orange';
      if(exam.qc.series_missing.length) return 'light-blue';
      if(exam.qc.series_no_template.length) return 'grey';
      return 'light-green';
    },
    query: function() {
      let self = this;
      // let pending = null;
      //
      // let sortby = {
      //   StudyTimestamp: -1
      // };
      //
      // let d = new Date();
      // d.setDate(d.getDate() - 90);
      //
      // let where = {
      //   istemplate: false,
      //   StudyTimestamp: {$gt: d}
      // };
      // // switch(this.search.sort) {
      // //     case "dateup":
      // //         sortby.StudyTimestamp = -1;
      // //         break;
      // //     case "datedown":
      // //         sortby.StudyTimestamp = 1;
      // //         break;
      // //     case "iibis":
      // //         sortby.IIBISID = -1;
      // //         break
      // //     default:
      // //         sortby.StudyTimestamp = -1;
      // // }
      // this.selected = null;
      // this.loading_series = true;
      // let self = this;

      let search_api = '';
      if(this.search_type === 'research') search_api = `${this.$config.api}/research/search/${this.search}`;
      if(this.search_type === 'subject') search_api = `${this.$config.api}/exam/subject/${this.search}`;
      if(this.search_type === 'calendar') search_api = `${this.$config.api}/exam/calendar`;
      console.log(search_api);

      this.$http
        .get(search_api)
        .then(
          function(res) {
            console.log(res.data);
            self.results = res.data;
          },
          function(err) {
            console.log(err);
          }
        );
    }
  },
  mounted() {
    // this.query();
  }
};
</script>

<style>

  .subbar {
    position: fixed;
    left: 65px;
    width: 275px;
    height: 100%;
    border-right: 1px solid #ddd;
    background-color: white;
  }

  .subbar h2 {
    color: #878787;
    font-weight: bold;
    font-size: 21px;
  }
  .subbar-list {
    overflow-x: hidden;
    overflow-y: scroll;
    width: 275px;
    position: fixed;
    top: 158px;
    bottom: 0;
  }

  .subbar-content {
    margin-left: 280px;
  }
</style>
