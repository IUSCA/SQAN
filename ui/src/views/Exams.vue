<template>
    <div style="display: inline-flex; width: 100%">
      <v-dialog
        v-model="dialog"
        max-width="500"
      >
        <ResearchDetail :research_id="research_id" v-if="research_id" />
      </v-dialog>
      <div class="subbar">
        <v-text-field
          v-model="search"
          append-icon="mdi-magnify"
          label="Search"
          single-line
          hide-details
          class="mx-5 my-5"
        ></v-text-field>
        <v-divider></v-divider>
        <div class="subbar-list">
          <div v-for="(researches, idx) in results" :key="idx" class="mb-3">
            <div v-for="(rs, _idx) in researches" :key="_idx">
              <div class="font-weight-light">{{rs.research.Modality}} / <span @click.stop="showDetails(rs.research.IIBISID)">{{rs.research.IIBISID}}</span> / {{rs.research.StationName}}</div>
              <span v-for="exam in rs.exams" :key="exam._id" @click="selectExam(exam._id)">
              <SubjectBlock :subject="exam" :selected="selected"></SubjectBlock>
            </span>
              <v-divider></v-divider>
            </div>
          </div>
        </div>
      </div>

      <v-divider vertical class="mx-3"></v-divider>
      <v-container fluid class="subbar-content">
        <Exam :exam_id="selected" v-if="selected" />
      </v-container>

    </div>
</template>

<script>
import SubjectBlock from "@/components/SubjectBlock.vue";
import Exam from "@/components/Exam.vue";
import ResearchDetail from "../components/research/ResearchDetail";

export default {
  name: "exams",
  components: { SubjectBlock, Exam, ResearchDetail },
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
      dialog: false
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
    query: function() {
      let pending = null;

      let sortby = {
        StudyTimestamp: -1
      };

      let d = new Date();
      d.setDate(d.getDate() - 90);

      let where = {
        istemplate: false,
        StudyTimestamp: {$gt: d}
      };
      // switch(this.search.sort) {
      //     case "dateup":
      //         sortby.StudyTimestamp = -1;
      //         break;
      //     case "datedown":
      //         sortby.StudyTimestamp = 1;
      //         break;
      //     case "iibis":
      //         sortby.IIBISID = -1;
      //         break
      //     default:
      //         sortby.StudyTimestamp = -1;
      // }
      this.selected = null;
      this.loading_series = true;
      let self = this;
      this.$http
        .get(`${this.$config.api}/exam/query`, {
          params: {
            skip: 0,
            limit: 5000000,
            where: where,
            sort: sortby,
            pending: pending
          }
        })
        .then(
          function(res) {
            console.log(res.data);
            self.results = res.data;
            self.loading_series = false;
          },
          function(err) {
            console.log(err);
          }
        );
    }
  },
  mounted() {
    this.query();
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
