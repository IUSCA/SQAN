<template>
  <div class="container">
    <div v-if="detail" class="card">
      <div class="card-header lighten-1">
        <div class="col-sm-6 col-md-6">
          <br />
          <div class="panel panel-default">
            <div class="panel-heading">
              Template Information
            </div>
            <div class="panel-body">
              <h5>
                <span><i class="fa fa-clock-o" aria-hidden="true"></i></span>
                <span>Timestamp:</span>
                <span>{{detail.date | date:'yyyy-MM-dd HH:mm:ss' }}</span>
              </h5>
              <h5>
                <span><i class="fa fa-list-ol" aria-hidden="true"></i></span>
                <span>Number of Series: </span>
                <span>{{ detail.series.length }}</span>
              </h5>
              <h5>
                <span
                  ><i class="fa fa-check-square" aria-hidden="true"></i
                ></span>
                <span>Series used for QC: </span>
                <span>{{ detail.usedInQC }}</span>
              </h5>
              <span v-if="detail.converted_to_template == true">
                <h5>
                  <h5><i class="fa fa-clone" aria-hidden="true"></i></h5>
                  <span>
                    This template was cloned from Subject
                    <b>{{ detail.parent_exam }}</b>
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
                uib-tooltip="All series in this template will be deleted"
                class="text-danger"
                style="cursor:pointer;"
                v-on="deleteTemplate(detail, $index)"
              >
                <h5>
                  <i class="fa fa-trash fa-sm" aria-hidden="true"></i>
                  Delete All Series
                </h5>
              </div>
              <div
                uib-tooltip="Only selected template series will be deleted"
                class="text-warning"
                style="cursor:pointer;"
                ng-class="{'faded': !(series2delete.length > 0)}"
                v-on="deleteSelectedSeries(detail, $index)"
              >
                <h5>
                  <i class="fa fa-trash fa-sm" aria-hidden="true"></i>
                  Delete {{ series2delete.length }} Selected Series
                </h5>
              </div>
              <div
                class="text-info"
                style="cursor:pointer;"
                v-on="getTemplateSeries(detail, $index)"
              >
                <h5>
                  <span
                    uib-tooltip="Show table listing all series in this template"
                    v-if="indexShowSeries != $index"
                    ><i class="fa fa-eye" aria-hidden="true"></i> Show
                    Series</span
                  >
                  <span
                    uib-tooltip="Hide the table"
                    v-if="indexShowSeries == $index"
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
//import TemplateDetail from "@/components/templates/TemplateDetail.vue";

export default {
  // components: { FilterInput, TemplateDetail },
  name: "templatedetail",

  props: {
    summary: Object
  },
  data() {
    return {
      // TODO: possible to have more than one exam_id here
      //       rename to summary.exam_ids in api
      current_detail_id: this.summary.exam_id[0],
      // keep track of details once we have loaded them from api
      details: {},
      detail: ""
    };
  },

  methods: {
    query: function() {
      this.$http
        .get("/api/qc/templatesummary/texams/" + this.current_detail_id)
        .then(
          res => {
            this.detail = res.data;
            console.log("Detail:", this.detail);
          },
          err => {
            console.log("Error contacting API");
            console.dir(err);
          }
        );
    },

    selectDetail(_id) {
      this.current_detail_id = _id;
      //console.log(this.current_detail_id);
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
