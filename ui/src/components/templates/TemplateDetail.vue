<template>
  <b-container v-if="benchmark">
    <b-row>
      <b-col>
        <b-card title="Benchmark Information">
          <div class="card">
            <div class="card-header lighten-1">
              <br />
              <div class="panel panel-default">
                <div class="panel-body">
                  <h5>
                    <span>
                      <font-awesome-icon
                        :icon="['far', 'clock']"
                        aria-hidden="true"
                      />
                    </span>
                    <span>Timestamp:</span>
                    <span>{{
                      format(parseISO(benchmark.date), "yyyy-MM-dd HH:mm:ss")
                    }}</span>
                  </h5>
                  <h5>
                    <span>
                      <font-awesome-icon icon="list-ol" aria-hidden="true" />
                    </span>
                    <span>Number of Series: </span>
                    <span>{{ benchmark.series.length }}</span>
                  </h5>
                  <h5>
                    <span>
                      <font-awesome-icon
                        icon="check-square"
                        aria-hidden="true"
                      />
                    </span>
                    <span>Series used for QC: </span>
                    <span>{{ benchmark.usedInQC }}</span>
                  </h5>
                  <span v-if="benchmark.converted_to_template == true">
                    <h5>
                      <h5>
                        <font-awesome-icon
                          :icon="['far', 'clone']"
                          aria-hidden="true"
                        />
                      </h5>
                      <span>
                        This benchmark was cloned from Subject
                        <b>{{ benchmark.parent_exam }}</b>
                      </span>
                    </h5>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </b-card>
      </b-col>

      <b-col>
        <br />
        <div class="panel panel-default">
          <div class="panel-heading">
            Action Links
          </div>
          <div class="panel-body">
            <div
              v-b-tooltip.hover
              title="All series in this benchmark will be deleted"
              class="text-danger"
              style="cursor:pointer;"
              v-on="deleteBenchmark()"
            >
              <h5>
                <font-awesome-icon icon="trash-alt" aria-hidden="true" />
                Delete All Series
              </h5>
            </div>
            <div
              v-b-tooltip.hover
              title="Only selected benchmark series will be deleted"
              class="text-warning"
              style="cursor:pointer;"
              ng-class="{'faded': !(seriesToDelete.length > 0)}"
              v-on="deleteSelectedSeries()"
            >
              <h5>
                <font-awesome-icon icon="trash-alt" aria-hidden="true" />
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
              </h5>
            </div>
          </div>
        </div>
      </b-col>
    </b-row>
  </b-container>
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

<style>
h4,
h5 {
  font-size: 12px;
}
</style>
