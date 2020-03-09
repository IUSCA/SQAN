<template>
  <div class="container">
    <div class="row">
      <div class="col-sm-11 col-offset-1">
        <h3>
          <font-awesome-icon :icon="['far', 'clone']" aria-hidden="true" />
          Template Summary Table
        </h3>
        <br />
        <filter-input v-on:update-filter="updateFilter" />
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
                  <span v-on:click="updateSort(fieldname)">
                    {{ fieldname }}
                  </span>
                  <font-awesome-icon
                    v-if="sortIcon(fieldname)"
                    :icon="sortIcon(fieldname)"
                  />
                </th>
                <th>View</th>
              </tr>
            </thead>

            <tbody>
              <template
                v-for="(summary, index) in filteredResults"
                v-bind:summary="summary"
                v-bind:index="index"
              >
                <tr
                  v-on:click="selectTemplate(summary.IIBISID)"
                  v-bind:key="summary.IIBISID"
                >
                  <td
                    v-for="field in fields"
                    v-bind:field="field"
                    v-bind:key="field"
                    class="text-center"
                  >
                    {{ summary[field] }}
                  </td>
                  <td class="text-center">
                    <font-awesome-icon
                      icon="angle-left"
                      v-if="summary.IIBISID != selected"
                    />
                    <font-awesome-icon
                      icon="angle-down"
                      v-if="summary.IIBISID == selected"
                    />
                  </td>
                </tr>
                <tr
                  v-if="summary.IIBISID == selected"
                  v-bind:key="summary.IIBISID + '-details'"
                >
                  <td colspan="6">
                    <template-detail v-bind:summary="summary"></template-detail>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import FilterMixin from "@/plugins/filters.js";
import FilterInput from "@/components/FilterInput.vue";
import TemplateDetail from "@/components/templates/TemplateDetail.vue";

export default {
  name: "templatesummary",
  components: { FilterInput, TemplateDetail },
  mixins: [FilterMixin],
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
        filter: "ascending",
        fieldname: "IIBISID"
      },
      results: [],
      search: "",
      selected: ""
    };
  },

  methods: {
    query: function() {
      this.$http.get("/api/qc/templatesummary/istemplate").then(
        res => {
          this.results = res.data;
          console.log(
            this.results.length + " benchmarks retrieved from exam db"
          );
          console.log(this.results);
        },
        err => {
          console.log("Error contacting API");
          console.dir(err);
        }
      );
    },

    selectTemplate(_id) {
      if (_id == this.selected) {
        this.selected = "";
      } else {
        this.selected = _id;
      }
      //console.log(this.selected);
    },

    updateSort: function(field) {
      if (field == this.sorting.fieldname) {
        // toggle the order
        if (this.sorting.filter == "ascending") {
          this.sorting.filter = "descending";
        } else {
          this.sorting.filter = "ascending";
        }
      } else {
        this.sorting.fieldname = field;
        this.sorting.filter = "ascending";
      }
    },
    updateFilter: function(term) {
      this.search = term;
      // console.log('updating search term', this.search)
    },
    sortIcon: function(field) {
      if (field == this.sorting.fieldname) {
        if (this.sorting.filter == "ascending") {
          return "arrow-down";
        } else {
          return "arrow-up";
        }
      } else {
        return "";
      }
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
