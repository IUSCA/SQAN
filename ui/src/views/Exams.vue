<template>
  <v-container fluid>
    <div class="display-1">
      <v-icon large>mdi-microscope</v-icon> Exams</div>
    <v-row>
      <v-col cols="3">
        <v-text-field
          v-model="search"
          append-icon="mdi-magnify"
          label="Search"
          single-line
          hide-details
          class="mb-5"
        ></v-text-field>
        <v-divider></v-divider>
        <div v-for="(researches, idx) in results" :key="idx" class="mb-3">
          <div v-for="(rs, _idx) in researches" :key="_idx">
            <div class="font-weight-light">{{rs.research.Modality}} / {{rs.research.IIBISID}} / {{rs.research.StationName}}</div>
            <span v-for="exam in rs.exams" :key="exam._id" @click="selectExam(exam._id)">
            <SubjectBlock :subject="exam"></SubjectBlock>
          </span>
            <v-divider></v-divider>
          </div>
        </div>
      </v-col>
      <v-col cols="9">
        <Exam :exam_id="selected" v-if="selected" />
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import SubjectBlock from "@/components/SubjectBlock.vue";
import Exam from "@/components/Exam.vue";

export default {
  name: "exams",
  components: { SubjectBlock, Exam },
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
      results: []
    };
  },
  methods: {
    selectExam(_id) {
      this.selected = _id;
      console.log(this.selected);
    },
    query: function() {
      let pending = null;

      let sortby = {
        StudyTimestamp: -1
      };

      let where = {
        istemplate: false
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

</style>
