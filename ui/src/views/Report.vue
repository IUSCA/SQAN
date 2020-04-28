<template>
  <div>
  <v-card class="report elevation-6 mb-6">
    <v-card-text>
      <v-row align="center" justify="center">
        <v-col cols="7">
          <v-autocomplete
            v-model="research"
            :items="research_ids"
            hide-no-data
            item-text="IIBISID"
            item-value="_id"
            label="Research ID"
            prepend-icon="mdi-database-search"
            @change="clear_report"
            return-object
          ></v-autocomplete>
        </v-col>
      </v-row>
      <v-row justify="center">
        <v-col cols="7">
          <v-autocomplete
            v-model="report_keys"
            :items="qckeys"
            outlined
            dense
            chips
            small-chips
            prepend-icon="mdi-key"
            label="Header Keywords"
            multiple
            @change="clear_report"
          ></v-autocomplete>
        </v-col>
      </v-row>
      <v-divider class="my-2"></v-divider>
      <v-row justify="end">
        <v-btn color="success" class="mr-2" @click="getReport">Submit</v-btn>
      </v-row>
    </v-card-text>
  </v-card>
  <v-tabs v-if="reports" dark>
    <v-tab v-for="(res, res_id) in reports" :key="res_id"><v-badge class="mx-2" :content="res.summary.length">{{res_id}}</v-badge></v-tab>

    <v-tab-item v-for="(res, res_id) in reports" :key="res_id">
      <v-tabs>
        <v-tab>Summary</v-tab>
        <v-tab>Series</v-tab>
        <v-tab-item>
          <v-data-table :items="res.summary" :headers="summary_table_headers"></v-data-table>
        </v-tab-item>
        <v-tab-item>
          <v-tabs vertical>
            <v-tab left v-for="s in res.series" :key="s">{{s}}</v-tab>
            <v-tab-item v-for="s in res.series" :key="s">
              <v-simple-table class="ml-5" dense>
                <thead>
                <th>Subject</th>
                <th>Timestamp</th>
                <th>Images</th>
                <th>Scans</th>
                <th v-for="col in report_keys" :key="col">{{col}}</th>
                </thead>
                <tbody>
                <template v-for="(sub_exams, sub) in res.subjects">
                  <tr v-for="(exam) in sub_exams" :key="exam.StudyTimestamp" v-if="s in exam.series">
                    <td class="text-no-wrap">{{sub}}</td>
                    <td class="text-no-wrap">{{exam.StudyTimestamp}}</td>
                    <td>{{exam.series[s].img_count}}</td>
                    <td>{{exam.series[s].scan_count}}</td>
                    <td v-for="col in report_keys" :key="col">{{exam.series[s][col]}}</td>
                  </tr>
                </template>
                </tbody>

              </v-simple-table>
            </v-tab-item>
          </v-tabs>
        </v-tab-item>
      </v-tabs>
    </v-tab-item>
  </v-tabs>
  </div>
</template>

<script>
  export default {
    name: "report",
    computed: {
      summary_table_headers() {
        return this.summary_cols.map(sc => {
          return {
            text: sc,
            value: sc,
            sortable: true
          }
        })
      },

    },
    data() {
      return {
        research_ids: [],
        qckeys: [],
        report_keys: [],
        research: null,
        reports: null,
        summary_cols: ['iibis','StationName','subject','StudyTimestamp','ManufacturerModelName','SoftwareVersions'],

    }
    },
    methods: {
      getResearches: function() {
        let self = this;
        this.$http.get(`${this.$config.api}/research?admin=true`)
          .then(function(res) {
            self.research_ids = res.data;
          }, function(err) {
            console.log(err);
          });
      },
      getQCKeys: function() {
        let self = this;
        this.$http.get(`${this.$config.api}/qc_keywords/allkeys`)
          .then( res => {
            console.log(res.data);
            self.qckeys = res.data.map(qk => {
              return qk.key;
            });
          }, err => {console.log(err)});
      },
      getReport: function() {
        let self = this;
        this.$http.post(`${this.$config.api}/research/report/${this.research.IIBISID}`, {keywords: this.report_keys})
          .then( res => {
            self.reports = res.data;
            console.log(res.data);
          }, err => {console.log(err)});
      },
      clear_report: function() {
        this.reports = null;
      }
    },
    mounted() {
      this.getResearches();
      this.getQCKeys();
    }
  };
</script>
