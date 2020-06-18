<template>
  <span>

     <v-dialog
       v-model="req_dialog"
       max-width="800"
     >
    <template v-slot:activator="{ on }">
      <v-btn
        color="green lighten-2"
        dark
        x-small
        v-on="on"
      >
        <v-icon x-small class="mr-1">mdi-file-chart</v-icon> Frame Duration Report
      </v-btn>
    </template>

    <v-card>
      <v-card-title class="green lighten-2">
        <v-icon class="mr-1">mdi-file-chart</v-icon> Frame Duration Report
      </v-card-title>
      <v-divider></v-divider>


      <v-card-text v-if="report.length">

        <v-btn x-small color="blue lighten-4" @click="exportToFile('csv', 'frame_duration')"><v-icon
          small>mdi-file-export</v-icon> Export as .csv</v-btn>
        <v-divider></v-divider>

        <v-data-table
          dense
          :items="report"
          :headers="fields"
          disable-pagination
          hide-default-footer
        ></v-data-table>

      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          v-show="!report.length"
          color="primary"
          @click="getReport"
        >
          Get Report
        </v-btn>
      </v-card-actions>

    </v-card>
  </v-dialog>
  </span>
</template>

<script>

  export default {
    name: 'FrameReport',
    props: {
      series_id: String
    },
    data() {
      return {
        report: [],
        fields: [
          {text: 'Frame #', value: 'frame'},
          {text: 'Start (s)', value: 'start_time'},
          {text: 'End (s)', value: 'end_time'},
          {text: 'Duration (s)', value: 'duration'},
          {text: 'Start Time', value: 'start_timestamp'},
          {text: 'End Time', value: 'end_timestamp'}
        ]
      }
    },
    computed: {},
    methods: {
      getReport() {

        let self = this;
        self.$store.dispatch('snack', 'Getting Frame Duration Report');

        this.$http.get(`${self.$config.api}/series/frame_report/${self.series_id}`)
          .then(res => {
            self.report = res.data;
            console.log(res.data);
            self.$emit('reqc');
          }, err => {
            self.$store.dispatch('snack', 'Error getting frame duration report!');
            console.log(err);
          });
      },
      makeCSV: function () {
        let headers = this.fields.map(f => {
          return f.value;
        });
        let str = headers.join(',');
        str += '\r\n';

        this.report.forEach(rl => {
          let line = [];
          headers.forEach(h => {
            line.push(rl[h]);
          });

          str += line.join(',') + '\r\n';
        });

        console.log(str);
        return str;
      },
      exportToFile: function (type, fileTitle) {

        let data = '';
        let blob = '';
        let exportedFilename = '';
        // if (type === 'json') {
        //   data = this.makeExport();
        //   exportedFilename = fileTitle + '.json' || 'export.json';
        //   blob = new Blob([JSON.stringify(data)], {type: "data:text/json;charset=utf-8;"});
        // }

        if (type === 'csv') {
          data = this.makeCSV();
          exportedFilename = fileTitle + '.csv' || 'export.csv';
          blob = new Blob([data], {type: 'text/csv;charset=utf-8;'});
        }

        if (navigator.msSaveBlob) { // IE 10+
          navigator.msSaveBlob(blob, exportedFilename);
        } else {
          var link = document.createElement("a");
          if (link.download !== undefined) { // feature detection
            // Browsers that support HTML5 download attribute
            var url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", exportedFilename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        }
      }

    }
  }
</script>
