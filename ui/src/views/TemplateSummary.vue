<template>
  <div class="container">
    <div class="row">
      <div class="col-sm-11 col-offset-1">
        <h3>
          <font-awesome-icon :icon="['far', 'clone']" aria-hidden="true" />
          Template Summary Table
        </h3>
        <br />
        <filter-input />
        <br /><br />
        <div class="row">
          <table
            class="table table-striped table-hover table-bordered info"
            width="100%"
            cellspacing="0"
          >
            <thead>
              <tr>
                <th
                  class="text-center"
                  v-for="fieldname in fieldnames"
                  v-bind:key="fieldname"
                >
                  <span v-on:click="sorting.fieldname = fieldname">
                    {{ fieldname }}
                  </span>
                  <font-awesome-icon
                    icon="arrow-up"
                    v-if="sorting.fieldname == fieldname"
                  />
                </th>
                <th>View</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import FilterInput from "@/components/FilterInput.vue";

export default {
  name: "templatesummary",
  components: { FilterInput },
  data() {
    return {
      fields: ["IIBISID", "Modality", "StationName", "radio_tracer", "count"],
      fieldnames: [
        "IIBISID",
        "Modality",
        "Station Name",
        "Radio Tracer",
        "# Study Instances"
      ],
      tseriesTable: [
        "Series Number",
        "Series Description",
        "Times used for QC",
        "# Images"
      ],
      sorting: {
        filter: "",
        fieldname: "IIBISID"
      },
      templates: []
    };
  },
  methods: {
    selectTemplate(_id) {
      this.selected = _id;
      console.log(this.selected);
    },
    query: function() {
      this.$http.get("/api/qc/templatesummary/istemplate").then(
        res => {
          this.templates = res.data;
          console.log(
            this.templates.length + " templates retrieved from exam db"
          );
          console.log(this.templates);
        },
        err => {
          console.log("Error contacting API");
          console.dir(err);
        }
      );

    }
  },
  mounted() {
    // console.log("Component has been created!");
    // console.log("Process.env", process.env);
    this.query();
  }
};
</script>

<style>
table {
  border-collapse: collapse;
}
.sel {
  background-color: #bce65e;
}
.desc {
  background-color: #d1e6ac;
}

button {
  background-color: Transparent;
  background-repeat: no-repeat;
  border: none;
  cursor: pointer;
  overflow: hidden;
  outline: none;
}
</style>
