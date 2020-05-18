<template>
  <div v-if="benchmarkData">
    <v-tabs v-model="tab" @change="changeTab" icons-and-text>
      <v-tab
        v-for="(benchmark, index) in summaryLocal.StudyTimestamp"
        :key="index"
      >
        {{ benchmark | date }}
        <v-icon v-if="benchmark.converted_to_template">
          mdi-checkbox-multiple
        </v-icon>
        <v-icon v-if="!benchmark.converted_to_template">
          mdi-checkbox-multiple-blank
        </v-icon>
      </v-tab>
    </v-tabs>

    <v-tabs-items v-model="tab">
      <v-tab-item v-for="benchmark in summaryLocal.exam_id" :key="benchmark">
        <v-row>
          <v-col cols="8">
            <v-card class="elevation-4 pl-5 pb-5" color="#B2EBF2">
              <v-card-title>Information</v-card-title>

              <div class="mb-2">
                <v-icon class="mr-2">mdi-clock</v-icon>
                <span>Timestamp:</span>
                <span>{{
                  benchmarkData.date | moment("MMM Do YYYY, h:mm:ssA")
                }}</span>
              </div>
              <div class="mb-2">
                <v-icon class="mr-2">mdi-format-list-bulleted</v-icon>
                <span>Number of Series: </span>
                <span>{{ orderedSeries.length }}</span>
              </div>
              <div class="mb-2">
                <v-icon class="mr-2">mdi-check-box-outline</v-icon>
                <span>Series used for QC: </span>
                <span>{{ benchmarkData.usedInQC }}</span>
              </div>
              <div
                class="mb-2"
                v-if="benchmarkData.converted_to_template == true"
              >
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
                      <v-icon class="mr-2 red--text">mdi-delete</v-icon> Delete
                      All Series
                    </v-list-item>
                  </template>
                  <span>All series in this benchmark will be deleted</span>
                </v-tooltip>

                <v-tooltip left>
                  <template v-slot:activator="{ on }">
                    <v-list-item v-on="on" @click="deleteSelectedSeries">
                      <v-icon class="mr-2 orange--text">
                        mdi-delete-outline
                      </v-icon>
                      Delete {{ selected.length }} Selected Series
                    </v-list-item>
                  </template>
                  <span>Only selected template series will be deleted</span>
                </v-tooltip>

                <v-tooltip left>
                  <template v-slot:activator="{ on }">
                    <v-list-item v-on="on" @click="toggleSeriesVisible">
                      <span v-show="!seriesVisible">
                        <v-icon class="mr-2 grey--text">mdi-eye</v-icon> Show
                        Template Series
                      </span>
                      <span v-show="seriesVisible">
                        <v-icon class="mr-2 grey--text">mdi-eye-off</v-icon>
                        Hide Template Series
                      </span>
                    </v-list-item>
                  </template>
                  <span>
                    Show/Hide table listing all series in this Benchmark
                  </span>
                </v-tooltip>
              </v-list>
            </v-card>
          </v-col>
        </v-row>

        <v-card v-if="seriesVisible">
          <div class="mt-5">
            <div class="headline">Template Series</div>
            <v-data-table
              :items="orderedSeries"
              item-key="SeriesNumber"
              :headers="tseriesHeaders"
              show-select
              v-model="selected"
            >
            </v-data-table>
          </div>
        </v-card>
      </v-tab-item>
    </v-tabs-items>
  </div>
</template>

<script>
export default {
  name: "TemplateDetail",

  props: {
    summary: Object,
  },
  data() {
    return {
      // TODO: possible to have more than one exam_id here
      //       rename to summary.exam_ids in api
      current_benchmark_id: this.summary.exam_id[0],
      benchmarkData: [],
      orderedSeries: [],
      seriesVisible: true,
      selected: [],
      summaryLocal: { ...this.summary },

      tab: null,
      tseriesHeaders: [
        {
          text: "Series Number",
          value: "SeriesNumber",
        },
        {
          text: "Series Description",
          value: "series_desc",
        },
        {
          text: "Times used for QC",
          value: "usedInQC",
        },
        {
          text: "# Images",
          value: "imageCount",
        },
      ],
    };
  },
  watch: {
    benchmarkData: function (val) {
      //return this._.orderBy(this.series, "SeriesNumber");
      //console.log("New value: ", val)
      this.orderedSeries = val.series
        .concat()
        .sort(this.$helpers.sortBy("SeriesNumber"));
      //console.log("benchmarkData changed:", this.orderedSeries);
    },
    summary: function (val) {
      this.summaryLocal = { ...val };
    },
  },

  methods: {
    query: function () {
      this.$http
        .get(
          `${this.$config.api}/templatesummary/texams/` +
            this.current_benchmark_id
        )
        .then(
          (res) => {
            this.benchmarkData = res.data;
            // console.log(this.benchmarkData.date)
            // console.log("benchmark:", this.benchmarkData);
          },
          (err) => {
            console.log("Error contacting API");
            console.dir(err);
          }
        );
    },
    opentemplate(tid) {
      // console.log(tid);
      window.open("template/" + tid);
    },

    async deleteBenchmark() {
      var alert = `Please confirm that you want to Delete all the series in this Template`;
      var r = confirm(alert);
      if (r == true) {
        var texam_id = this.benchmarkData.exam_id;
        // console.log("Deleting template exam " + texam_id);
        this.$http
          .get(this.$config.api + "/templatesummary/deleteall/" + texam_id, {})
          .then((res) => {
            console.log(res.data);
            // remove the timestamp from the local copy
            var index = this.summaryLocal.StudyTimestamp.indexOf(this.benchmarkData.date);
            if (index !== -1) this.summaryLocal.StudyTimestamp.splice(index, 1);

            //$scope.templatebytimestamp.splice(index,1);
          });
      } else {
        console.log("Deletion canceled");
      }
      //console.log("deleteBenchmark called");
    },

    async deleteSelectedSeries() {
      // console.log("deleteSelectedSeries called");
      var alert = `Please confirm that you want to delete ${this.selected.length} selected series in this Template`;
      var r = confirm(alert);
      if (r == true) {
        //var s2d = 0;
        for (const series of this.selected) {
          // console.log(series);
          const result = await this.$http.get(
            `${this.$config.api}/templatesummary/deleteselected/` +
              series.template_id,
            {}
          );
          console.log(result);
          this.selected = [];
          this.query();
        }
      } else {
        console.log("Deletion canceled");
      }
    },

    toggleSeriesVisible() {
      if (!this.seriesVisible) {
        this.seriesVisible = true;
      } else {
        this.seriesVisible = false;
      }
    },

    changeTab() {
      // console.log(this.tab);
      this.selected = [];
      this.current_benchmark_id = this.summaryLocal.exam_id[this.tab];
      this.query();
    },
  },
  // computed: {
  //   orderedSeries: function () {
  //     //return this._.orderBy(this.series, "SeriesNumber");
  //     return this.benchmarkData.series
  //       .concat()
  //       .sort(this.$helpers.sortBy("SeriesNumber"));
  //   },
  // },
  mounted() {
    // console.log("Component has been created!");
    // console.log("summary", this.summary);
    this.query();
  },
};
</script>

<style scoped>
span {
  padding-right: 5px;
}
</style>
