<template>
  <div class="container">
    <div v-if="benchmark" class="card">
      <div class="card-header lighten-1">
        <div class="col-sm-6 col-md-6">
          <br />
          <div class="panel panel-default">
            <div class="panel-heading">
              Benchmark Information
            </div>
            <div class="panel-body">
              <h5>
                <span><i class="fa fa-clock-o" aria-hidden="true"></i></span>
                <span>Timestamp:</span>
                <span>{{
                  format(parseISO(benchmark.date), "yyyy-MM-dd HH:mm:ss")
                }}</span>
              </h5>
              <h5>
                <span><i class="fa fa-list-ol" aria-hidden="true"></i></span>
                <span>Number of Series: </span>
                <span>{{ benchmark.series.length }}</span>
              </h5>
              <h5>
                <span
                  ><i class="fa fa-check-square" aria-hidden="true"></i
                ></span>
                <span>Series used for QC: </span>
                <span>{{ benchmark.usedInQC }}</span>
              </h5>
              <span v-if="benchmark.converted_to_template == true">
                <h5>
                  <h5><i class="fa fa-clone" aria-hidden="true"></i></h5>
                  <span>
                    This benchmark was cloned from Subject
                    <b>{{ benchmark.parent_exam }}</b>
                  </span>
                </h5>
              </span>
            </div>
          </div>
        </div>

        <div class="col-sm-2"></div>
        <div class="col-sm-4">
          <br />
          <div class="panel panel-default">
            <div class="panel-heading">
              Action Links
            </div>
            <div class="panel-body">
              <div
                uib-tooltip="All series in this benchmark will be deleted"
                class="text-danger"
                style="cursor:pointer;"
                v-on="deleteBenchmark()"
              >
                <h5>
                  <i class="fa fa-trash fa-sm" aria-hidden="true"></i>
                  Delete All Series
                </h5>
              </div>
              <div
                uib-tooltip="Only selected benchmark series will be deleted"
                class="text-warning"
                style="cursor:pointer;"
                ng-class="{'faded': !(seriesToDelete.length > 0)}"
                v-on="deleteSelectedSeries()"
              >
                <h5>
                  <i class="fa fa-trash fa-sm" aria-hidden="true"></i>
                  Delete {{ seriesToDelete.length }} Selected Series
                </h5>
              </div>
              <div
                class="text-info"
                style="cursor:pointer;"
                v-on="getBenchmarkSeries()"
              >
                <h5>
                  <span
                    uib-tooltip="Show table listing all series in this Benchmark"
                    v-if="!seriesVisible"
                    ><i class="fa fa-eye" aria-hidden="true"></i> Show
                    Series</span
                  >
                  <span
                    uib-tooltip="Hide the table"
                    v-if="seriesVisible"
                    ><i class="fa fa-eye-slash" aria-hidden="true"></i> Hide
                    Series</span
                  >
                </h5>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { format, parseISO } from "date-fns";

export default {
  // components: { BenchmarkSeries },
  name: "benchmark",

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
      benchmark: "",
      seriesVisible: false,
      seriesToDelete: [],
      format,
      parseISO
    };
  },

  methods: {
    query: function() {
      this.$http
        .get("/api/qc/templatesummary/texams/" + this.current_benchmark_id)
        .then(
          res => {
            this.benchmark = res.data;
            console.log("benchmark:", this.benchmark);
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

    getBenchmarkSeries() {
      console.log("getBenchmarkSeries called");
    }
  },
  mounted() {
    // console.log("Component has been created!");
    // console.log("summary", this.summary);
    this.query();
  }
};
</script>

<style></style>
