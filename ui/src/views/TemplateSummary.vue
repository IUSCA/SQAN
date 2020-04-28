<template>
  <div class="container--fluid">

    <v-btn color="error" small @click="show_notemp = !show_notemp"><v-icon small class="mr-2">mdi-alert</v-icon> {{noTemplates.length}} researches have no templates</v-btn>

    <v-data-table
      v-show="show_notemp"
      :items="noTemplates"
      :headers="noTemp_headers"
      :search="search"
      dense
      class="elevation-4"
      item-key="_id"
    >
    </v-data-table>

        <div style="width: 250px">
        <v-text-field
          v-model="search"
          append-icon="mdi-magnify"
          label="Search"
          single-line
          hide-details
        ></v-text-field>
        </div>
        <v-divider class="my-2"></v-divider>
        <v-data-table
          :items="results"
          :headers="headers"
          :search="search"
          show-expand
          dense
          class="elevation-4"
          :expanded.sync="expanded"
          item-key="_id"
        >
          <template v-slot:expanded-item="{ headers, item }">
            <td :colspan="headers.length">
              <template-detail v-bind:summary="item" class="my-3"></template-detail>
            </td>
          </template>

        </v-data-table>
  </div>
</template>

<script>
// import FilterMixin from "@/plugins/filter_results.js";
// import FilterInput from "@/components/FilterInput.vue";
import TemplateDetail from "@/components/templates/TemplateDetail.vue";

export default {
  name: "templatesummary",
  components: { TemplateDetail },
  // mixins: [FilterMixin],
  data() {
    return {
      // fields: ["IIBISID", "Modality", "StationName", "radio_tracer", "count"],
      // fieldnames: [
      //   "IIBISID",
      //   "Modality",
      //   "Station Name",
      //   "Radio Tracer",
      //   "# Study Instances"
      // ],
      expanded: [],
      show_notemp: false,
      noTemp_headers: [
        {
          text: 'IIBISID',
          value: 'IIBISID',
          sortable: true
        },
        {
          text: 'Modality',
          value: 'Modality',
          sortable: true
        },
        {
          text: 'Station Name',
          value: 'StationName',
          sortable: true
        }
      ],

      headers: [
        {
          text: 'IIBISID',
          value: 'IIBISID',
          sortable: true
        },
        {
          text: 'Modality',
          value: 'Modality',
          sortable: true
        },
        {
          text: 'Station Name',
          value: 'StationName',
          sortable: true
        },
        {
          text: 'Radio Tracer',
          value: 'radio_tracer',
          sortable: true
        },
        {
          text: '# Study Instances',
          value: 'count',
          sortable: true
        }
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
      noTemplates: [],
      search: "",
      selected: ""
    };
  },

  methods: {
    query: function() {
      this.$http.get(`${this.$config.api}/templatesummary/istemplate`)
        .then(res => {
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

    getNoTemplates: function() {
      let self = this;
      this.$http.get(`${this.$config.api}/templatesummary/notemplate`)
        .then( res => {
        self.noTemplates = res.data;
        console.log(res.data);
        console.log(res.data.length + ' researches have no templates!');
      }, function(err) {
        console.log("Error contacting API");
        console.dir(err);
      });
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
    this.getNoTemplates();
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
