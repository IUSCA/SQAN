<template>
    <div class="ml-2">

      <v-dialog
        v-model="exam_dialog"
        max-width="90%"
      >
        <v-card>
          <Exam :exam_id="selected" v-if="selected" />
        </v-card>
      </v-dialog>

      <v-tabs v-model="tab" @change="changeTab">
        <v-tab><v-icon class="mr-2">mdi-magnify</v-icon> Search</v-tab>
        <v-tab><v-icon class="mr-2">mdi-calendar</v-icon> Calendar</v-tab>

        <v-tabs-items v-model="tab">
          <v-tab-item>

            <v-text-field
              v-model="search"
              label="Search"
              hide-details
              style="margin-right: 15px; max-width: 460px"
            >
              <template slot="append">
                <v-btn color="success" style="margin-bottom: 6px" @click="query">
                  <v-icon left>mdi-magnify</v-icon>
                  Search
                </v-btn>
              </template>
            </v-text-field>

            <v-radio-group v-model="search_type" row @change="updateQuery">
              <v-radio label="Research" value="research"></v-radio>
              <v-radio label="Subject" value="subject"></v-radio>
            </v-radio-group>

            <hr>
            <v-row dense v-if="search_type === 'research'">

              <ResearchTable :results="results" v-if="results.length"></ResearchTable>
<!--              <v-col-->
<!--                v-for="res in results"-->
<!--                :key="res.research._id"-->
<!--                :cols="4"-->
<!--              >-->
<!--                <ResearchCard class="ma-2" :research="res.research" :exams="res.exams"></ResearchCard>-->
<!--              </v-col>-->
            </v-row>
            <v-row dense v-if="search_type === 'subject'">

              <SubjectTable :results="results" v-if="results !== []"></SubjectTable>
<!--              <v-col-->
<!--                v-for="res in results"-->
<!--                :key="res.subject"-->
<!--                :cols="4"-->
<!--              >-->
<!--                <SubjectCard :subject="res"></SubjectCard>-->
<!--              </v-col>-->
            </v-row>
          </v-tab-item>
          <v-tab-item>
            <v-text-field
              row
              style="max-width: 300px"
              v-model="filter"
              append-icon="mdi-filter"
              label="Filter"
              single-line
              hide-details
              class="mx-5 my-5"
            ></v-text-field>
            <hr>

            <div v-if="calendarData.length">

              <v-toolbar flat color="white">
                <v-btn fab text small color="grey darken-2" @click="$refs.calendar.prev()">
                  <v-icon small>mdi-chevron-left</v-icon>
                </v-btn>
                <v-btn fab text small color="grey darken-2" @click="$refs.calendar.next()">
                  <v-icon small>mdi-chevron-right</v-icon>
                </v-btn>
                <v-toolbar-title>{{ title }}</v-toolbar-title>
              </v-toolbar>
              <v-row style="height: 100%">
                <v-col
                  sm="12"
                  class="pl-4"
                >
                <v-calendar
                  ref="calendar"
                  v-model="start"
                  :events="calendarData"
                  :start="start"
                  :event-color="examColor"
                  event-ripple
                  :event-more="false"
                  @change="getEvents"
                  @click:event="eventClick"
                ></v-calendar>
                </v-col>
              </v-row>


            </div>

          </v-tab-item>
        </v-tabs-items>
      </v-tabs>

    </div>
</template>

<script>
// import SubjectBlock from "@/components/SubjectBlock.vue";
import ResearchTable from "../components/research/ResearchTable";
import SubjectTable from "../components/research/SubjectTable";
import Exam from "@/components/Exam.vue";

export default {
  name: "exams",
  components: {SubjectTable, ResearchTable, Exam },
  computed: {
    calendarData() {
      if(this.search_type !== 'calendar') return [];

      let cD = this.results.filter( e => {
        if(!this.filter) return true;
        let lcF = this.filter.toLowerCase();
        if(!e.subject.toLowerCase().includes(lcF) && !e.research_id.IIBISID.toLowerCase().includes(lcF)) return false;
        return true;
      }).map( e => {
        e.start = this.$moment(e.StudyTimestamp).add(5, 'hours').format('YYYY-MM-DD');
        e.name = `${e.research_id.IIBISID} | ${e.subject}`;
        return e;
      });
      console.log(cD);
      return cD;
    },
    title () {

      let thisMonth = this.start.split('-');

      const startMonth = this.$moment(thisMonth[1], 'MM').format('MMM');

      const startYear = thisMonth[0];


      return `${startMonth} ${startYear}`;
    },
  },
  data() {
    return {
      ranges: {
        30: "30 days",
        60: "60 days",
        90: "90 days",
        all: "All Time"
      },
      type: 'month',
      typeOptions: [
        { text: 'Day', value: 'day' },
        { text: 'Week', value: 'week' },
        { text: 'Month', value: 'month' },
      ],
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
      filter: '',
      research_id: null,
      research_dialog: false,
      exam_dialog: false,
      start: this.$moment().format('YYYY-MM-DD'),
      search_type: 'research',
      selectedEvent: null,
      selectedElement: null,
      tab: null,
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
    changeTab: function(tab) {
      console.log(tab);
      if(tab == 0) this.search_type = 'research';
      if(tab == 1) this.search_type = 'calendar';
      this.updateQuery();
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
      this.results = [];
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

      if(this.search_type === 'research' || this.search_type === 'subject') {
        if(this.search === '') return;
      }

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
    },
    getEvents ({ start, end }) {
        console.log(start);
        console.log(end);
    },
    eventClick ({ nativeEvent, event }) {
      console.log(nativeEvent, event);
      this.selected = event._id;
      this.exam_dialog = true;
      nativeEvent.stopPropagation()
    },
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

  .v-dialog {
    position: absolute;
    top: 40px;
  }

  .v-calendar-weekly {
    display: table !important;
    table-layout: fixed !important;
  }
  .v-calendar-weekly__week {
    height: auto !important;
    display: table-row !important;
  }

  .v-calendar-weekly__head {
    height: auto !important;
    display: table-row !important;
  }

  .v-calendar-weekly__day {
    display: table-cell !important;
    width: calc(100% / 7) !important;
  }

  .v-calendar-weekly__head-weekday {
    display: table-cell !important;
    width: calc(100% / 7) !important;
  }

</style>
