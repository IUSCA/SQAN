<template>
  <div v-if="benchmarkData">
    <v-tabs v-model="tab" @change="changeTab" icons-and-text>

      <v-tab
        v-for="(benchmark, index) in summary.StudyTimestamp"
        :key="index"

      >  {{benchmark | date }}
        <v-icon v-if="benchmark.converted_to_template" >mdi-checkbox-multiple</v-icon>
        <v-icon v-if="!benchmark.converted_to_template" >mdi-checkbox-multiple-blank</v-icon>
      </v-tab>
    </v-tabs>

    <v-tabs-items v-model="tab">
      <v-tab-item
        v-for="benchmark in summary.exam_id"
        :key="benchmark"
      >
        <v-row>
          <v-col cols="8">
            <v-card class="elevation-4 pl-5 pb-5" color="#B2EBF2">
              <v-card-title>Information</v-card-title>

              <div class="mb-2">
                <v-icon class="mr-2">mdi-clock</v-icon>
                <span>Timestamp:</span>
                <span>{{ benchmarkData.date | date }}</span>
              </div>
              <div class="mb-2">
                <v-icon class="mr-2">mdi-format-list-bulleted</v-icon>
                <span>Number of Series: </span>
                <span>{{ benchmarkData.series.length }}</span>
              </div>
              <div class="mb-2">
                <v-icon class="mr-2">mdi-check-box-outline</v-icon>
                <span>Series used for QC: </span>
                <span>{{ benchmarkData.usedInQC }}</span>
              </div>
              <div class="mb-2" v-if="benchmarkData.converted_to_template == true">
                <v-icon class="mr-2">mdi-content-copy</v-icon>
                <span>
                  This template was cloned from Subject
                  <b>{{ benchmarkData.parent_exam }}</b>
                </span>
              </div>
            </v-card>
          </v-col>

          <v-col cols="4">
            <v-card class="elevation-4 pl-5 pb-5 pr-5" color="#FFCCBC">
              <v-card-title>Actions</v-card-title>

              <v-list elevation="2" rounded>
                <v-tooltip left>
                <template v-slot:activator="{ on }">
                  <v-list-item v-on="on" @click="deleteBenchmark">
                    <v-icon class="mr-2 red--text">mdi-delete</v-icon> Delete All Series
                  </v-list-item>
                </template>
                  <span>All series in this benchmark will be deleted</span>
                </v-tooltip>

                <v-tooltip left>
                <template v-slot:activator="{ on }">
                  <v-list-item v-on="on" @click="deleteSelectedSeries">
                    <v-icon class="mr-2 orange--text">mdi-delete-outline</v-icon> Delete {{ seriesToDelete.length }} Selected Series
                  </v-list-item>
                </template>
                <span>Only selected template series will be deleted</span>
                </v-tooltip>

                <v-tooltip left>
                  <template v-slot:activator="{ on }">
                  <v-list-item v-on="on" @click="toggleSeriesVisible">
                    <span v-show="!seriesVisible">
                      <v-icon class="mr-2 grey--text">mdi-eye</v-icon> Show Template Series
                    </span>
                    <span v-show="seriesVisible">
                      <v-icon class="mr-2 grey--text">mdi-eye-off</v-icon> Hide Template Series
                    </span>
                  </v-list-item>
                  </template>
                  <span>Show/Hide table listing all series in this Benchmark</span>
                </v-tooltip>
              </v-list>
            </v-card>
          </v-col>
        </v-row>


        <v-card v-if="seriesVisible">
          <BenchmarkSeries :series="benchmarkData.series" />
        </v-card>
      </v-tab-item>
    </v-tabs-items>
  </div>
</template>

<script>
import BenchmarkSeries from "@/components/templates/BenchmarkSeries.vue";

export default {
  components: { BenchmarkSeries },
  name: "BenchmarkDetail",

  props: {
    summary: Object
  },
  data() {
    return {
      // TODO: possible to have more than one exam_id here
      //       rename to summary.exam_ids in api
      current_benchmark_id: this.summary.exam_id[0],
      // keep track of benchmarks once we have loaded them from api
      benchmarks: {},
      benchmarkData: "",
      seriesVisible: false,
      seriesToDelete: [],
      // BenchmarkSeries,
      tab: null,
    };
  },

  methods: {
    query: function() {
      this.$http
        .get(`${this.$config.api}/templatesummary/texams/` + this.current_benchmark_id)
        .then(
          res => {
            this.benchmarkData = res.data;
            console.log("benchmark:", this.benchmarkData);
          },
          err => {
            console.log("Error contacting API");
            console.dir(err);
          }
        );
    },
    selectBenchmark(_id) {
      this.current_benchmark_id = _id;
      //console.log(this.current_benchmark_id);
    },

    deleteBenchmark() {
      console.log("deleteBenchmark called");
    },

    deleteSelectedSeries() {
      console.log("deleteSelectedSeries called");
    },

    toggleSeriesVisible() {
      if (!this.seriesVisible) {
        this.seriesVisible = true;
      } else {
        this.seriesVisible = false;
      }
    },

    changeTab() {
      console.log(this.tab);
      this.current_benchmark_id = this.summary.exam_id[this.tab];
      this.query();
    }
  },
  mounted() {
    // console.log("Component has been created!");
    console.log("summary", this.summary);
    this.query();
  }
};
</script>

<style scoped>
span {
  padding-right: 5px;
}
</style>
