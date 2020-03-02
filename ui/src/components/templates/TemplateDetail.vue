<template>
  <b-container v-if="benchmarkData">
    <b-tabs type="tabs" active="activePill">
      <b-tab
        v-for="(benchmark, index) in benchmarks"
        v-bind:benchmark="benchmark"
        v-bind:index="index"
        v-bind:key="benchmark.exam_id"
      >
        <uib-tab-heading>
          <i v-if="benchmark.converted_to_template" class="fa fa-clone"></i>
          <i
            v-if="!benchmark.converted_to_template"
            class="fa fa-fw fa-file-o"
          ></i>
          {{benchmark.date | date:'short':'-0400'}}
        </uib-tab-heading>
      </b-tab>
    </b-tabs>

    <b-row>
      <b-col>
        <b-card header="Benchmark Information">
          <div>
            <span>
              <font-awesome-icon :icon="['far', 'clock']" aria-hidden="true" />
            </span>
            <span>Timestamp:</span>
            <span>{{
              format(parseISO(benchmarkData.date), "yyyy-MM-dd HH:mm:ss")
            }}</span>
          </div>
          <div>
            <span>
              <font-awesome-icon icon="list-ol" aria-hidden="true" />
            </span>
            <span>Number of Series: </span>
            <span>{{ benchmarkData.series.length }}</span>
          </div>
          <div>
            <span>
              <font-awesome-icon icon="check-square" aria-hidden="true" />
            </span>
            <span>Series used for QC: </span>
            <span>{{ benchmarkData.usedInQC }}</span>
          </div>
          <div v-if="benchmarkData.converted_to_template == true">
            <span>
              <font-awesome-icon :icon="['far', 'clone']" aria-hidden="true" />
            </span>
            <span>
              This benchmark was cloned from Subject
              <b>{{ benchmarkData.parent_exam }}</b>
            </span>
          </div>
        </b-card>
      </b-col>

      <b-col>
        <b-card header="Action Links">
          <div class="panel panel-default">
            <div
              v-b-tooltip.hover
              title="All series in this benchmark will be deleted"
              class="text-danger"
              style="cursor:pointer;"
              v-on:click="deleteBenchmark()"
            >
              <span>
                <font-awesome-icon icon="trash-alt" aria-hidden="true" />
                Delete All Series
              </span>
            </div>
            <div
              v-b-tooltip.hover
              title="Only selected benchmark series will be deleted"
              class="text-warning"
              style="cursor:pointer;"
              ng-class="{'faded': !(seriesToDelete.length > 0)}"
              v-on:click="deleteSelectedSeries()"
            >
              <span>
                <font-awesome-icon icon="trash-alt" aria-hidden="true" />
                Delete {{ seriesToDelete.length }} Selected Series
              </span>
            </div>
            <div
              class="text-info"
              style="cursor:pointer;"
              v-on:click="toggleSeriesVisible()"
            >
              <span
                v-b-tooltip.hover
                title="Show table listing all series in this Benchmark"
                v-if="!seriesVisible"
              >
                <font-awesome-icon icon="eye" aria-hidden="true" />
                Show Series</span
              >
              <span
                v-b-tooltip.hover
                title="Hide the table"
                v-if="seriesVisible"
                ><i class="fa fa-eye-slash" aria-hidden="true"></i> Hide
                Series</span
              >
            </div>
          </div>
        </b-card>
      </b-col>
    </b-row>

    <b-row v-if="seriesVisible">
      <BenchmarkSeries :series="benchmarkData.series" />
    </b-row>
  </b-container>
</template>

<script>
import BenchmarkSeries from "@/components/templates/BenchmarkSeries.vue";

import { format, parseISO } from "date-fns";

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
      seriesVisible: true,
      seriesToDelete: [],
      format,
      parseISO,
      BenchmarkSeries
    };
  },

  methods: {
    query: function() {
      this.$http
        .get("/api/qc/templatesummary/texams/" + this.current_benchmark_id)
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
    }
  },
  mounted() {
    // console.log("Component has been created!");
    console.log("summary", this.summary);
    this.query();
  }
};
</script>

<style>
span {
  padding-right: 5px;
}
</style>
