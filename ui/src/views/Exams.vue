<template>
    <div style="display: inline-flex; width: 100%">

      <v-dialog
        v-model="exam_dialog"
        max-width="90%"
      >
        <v-card>
          <Exam :exam_id="selected" v-if="selected" />
        </v-card>
      </v-dialog>

      <v-tabs v-model="tab" @change="changeTab">
        <v-tab>Search</v-tab>
        <v-tab>Calendar</v-tab>

        <v-tabs-items v-model="tab">
          <v-tab-item>
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
              <v-col
                v-for="res in results"
                :key="res.subject"
                :cols="4"
              >
                <SubjectCard :subject="res"></SubjectCard>
              </v-col>
            </v-row>
          </v-tab-item>
          <v-tab-item>
            <v-text-field
              row
              v-model="filter"
              append-icon="mdi-filter"
              label="Filter"
              single-line
              hide-details
              class="mx-5 my-5"
            ></v-text-field>
            <hr>

            <div v-if="calendarData.length">

              <v-row>
                <v-col class="mb-4" sm="12">
                  <v-btn
                    fab
                    small
                    absolute
                    left
                    color="primary"
                    @click="$refs.calendar.prev()"
                  >
                    <v-icon dark>mdi-chevron-left</v-icon>
                  </v-btn>
                  <v-btn
                    fab
                    small
                    absolute
                    right
                    color="primary"
                    @click="$refs.calendar.next()"
                  >
                    <v-icon dark>mdi-chevron-right</v-icon>
                  </v-btn>
                  <br>
                  <v-select
                    class="mt-5"
                    v-model="type"
                    :items="typeOptions"
                    label="Type"
                    hide-details
                    outlined
                    dense
                  ></v-select>
                </v-col>
              </v-row>
              <v-row>
                <v-col
                  sm="12"
                  lg="9"
                  class="pl-4"
                >
                <v-calendar
                  ref="calendar"
                  v-model="start"
                  :events="calendarData"
                  :start="start"
                  :type="type"
                  :event-color="examColor"
                  event-ripple
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
import SubjectCard from "../components/research/SubjectCard";
import Exam from "@/components/Exam.vue";

export default {
  name: "exams",
  components: {SubjectCard, ResearchTable, Exam },
  computed: {
    calendarData() {
      if(this.search_type !== 'calendar') return [];

      let cD = this.results.filter( e => {
        if(!this.filter) return true;
        let lcF = this.filter.toLowerCase();
        if(!e.subject.toLowerCase().includes(lcF) && !e.research_id.IIBISID.toLowerCase().includes(lcF)) return false;
        return true;
      }).map( e => {
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
      tab: null
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
</style>
