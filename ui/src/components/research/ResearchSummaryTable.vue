<template>
  <div>

    <div class="caption mb-2">Download Summary</div>
    <v-btn x-small color="blue lighten-4" @click="exportToFile('csv', 'research_summary')"><v-icon small>mdi-file-export</v-icon> .csv</v-btn>
    <v-btn x-small color="blue lighten-4" @click="exportToFile('json','research_summary')"><v-icon small>mdi-file-export</v-icon> .json</v-btn>

    <v-tabs v-model="tab">
      <v-tab v-for="(r, _id) in research_data" :key="_id">{{r.modality}} ({{r.research_summary.subjects.length}})</v-tab>
      <v-tabs-items v-model="tab">
        <v-tab-item v-for="(mdata, idx) in research_data" :key="idx">

          <div class="font-weight-light">Station: {{mdata.station_name}}</div>
          <div class="font-weight-light" v-show="mdata.radio_tracer !== null">Radio Tracer: {{mdata.radio_tracer}}</div>
          <v-simple-table>
            <template v-slot:default>
              <table class="table table-scroll table-condensed">
                <thead>
                <th>Series</th>
                <th
                  class="text-muted"
                  v-for="sub in filtered_subjects(mdata.research_summary.subjects)"
                  :key="sub"
                >
                  {{sub}}
                </th>
                </thead>
                <tbody>
                <tr v-for="sd in filtered_series(mdata.research_summary.series_desc)" :key="sd">
                  <td><span class="pull-right">{{sd}}&nbsp;&nbsp;</span></td>
                  <td style="white-space:nowrap" v-for="sub in filtered_subjects(mdata.research_summary.subjects)" :key="sub">
            <span
              v-for="exam in mdata.research_summary.exams[sub]"
              :key="exam._id"
            >
              <SeriesBox :series="exam[sd]" v-if="exam[sd]"></SeriesBox>
            </span>
                  </td>
                </tr>
                </tbody>
              </table>
            </template>
          </v-simple-table>
        </v-tab-item>
      </v-tabs-items>
    </v-tabs>
  </div>
</template>

<script>

  import SeriesBox from "./SeriesBox";

  export default {
    name: 'ResearchSummaryTable',
    components: {SeriesBox},
    props: {
      research: Object,
      series_filter: String,
      subject_filter: String
    },
    computed: {
    },
    data() {
      return {
        tab: '',
        research_data: {}
      }
    },
    methods: {
      getSummary: function() {
        let self = this;
        this.research.researches.forEach( r => {
          console.log(r._id);
          this.$http.get(`${this.$config.api}/research/summary/${r._id}`)
            .then(function(res) {
              console.log(res.data);
              self.$set(self.research_data, r._id, {
                modality: r.Modality,
                station_name: r.StationName,
                radio_tracer: r.radio_tracer,
                research_summary: res.data
              });
            }, (err) => {
              console.log(err)
            });
        })
      },
      filtered_subjects(subjects) {
        return subjects.filter(rs => {
          if(this.subject_filter.length && !rs.includes(this.subject_filter)) return false;
          return true;
        })
      },
      filtered_series(series) {
        return series.filter(sd => {
          if(this.series_filter.length && !sd.includes(this.series_filter)) return false;
          return true;
        })
      },
      allSubjects() {
        let master_list = [];
        Object.values(this.research_data).forEach(rd => {
          rd.research_summary.subjects.forEach(sub => {
            if(!master_list.includes(sub)) master_list.push(sub);
          })
        })
        return master_list;
      },
      makeExport: function() {
        var data = [["modality","series"]];
        //console.log($scope.summary);
        var mods = Object.keys(this.research_data);
        let self = this;
        let subjects = this.allSubjects();
        mods.forEach(function(mod){
          var rmod = self.research_data[mod];
          var res = rmod.research_summary;
          res.series_desc.forEach(function(sd){
            var row = {"modality":rmod.modality,"series":sd};
            subjects.forEach(function(sub){
              var exams = res.exams[sub];
              if(exams == undefined) return;
              exams.forEach(function(ex){
                var s = ex[sd];
                if(!data[0].includes(sub)) data[0].push(sub);

                var qc1 = 'na';
                if(s !== undefined && s.qc1_state !== undefined) qc1 = s.qc1_state;
                if(row[sub] !== undefined) {
                  row[sub] = row[sub] + '|' + qc1;
                } else {
                  row[sub] = qc1;
                }

              });
            });
            data.push(row);
          });
        });
        console.log(data);
        return data;
      },
      makeCSV: function() {
        let data = this.makeExport();
        let headers = data.shift();
        let str = headers.join(',');
        str += '\r\n';

        data.forEach(dl => {
          let line = [];
          headers.forEach(h => {
            line.push(dl[h]);
          });

          str += line.join(',') + '\r\n';
        });

        console.log(str);
        return str;
      },
      exportToFile: function(type, fileTitle) {

        let data = '';
        let blob = '';
        let exportedFilename = '';
        if(type === 'json') {
          data = this.makeExport();
          exportedFilename = fileTitle + '.json' || 'export.json';
          blob = new Blob([JSON.stringify(data)], { type: "data:text/json;charset=utf-8;"});
        }

        if(type === 'csv') {
          data = this.makeCSV();
          exportedFilename = fileTitle + '.csv' || 'export.csv';
          blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
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
    },
    mounted() {
      this.getSummary();
    }
  }
</script>

<style>

  /*.table {*/
  /*  padding-right: 50px;*/
  /*  z-index: 9999;*/
  /*}*/

  /*!***************** Rotate Table Header *************!*/
  /*.table-header-rotated th.row-header{*/
  /*  width: auto;*/
  /*}*/

  /*.table-header-rotated td{*/
  /*  !*width: 40px;*!*/
  /*  border-top: 1px solid #dddddd;*/
  /*  border-left: 1px solid #dddddd;*/
  /*  border-right: 1px solid #dddddd;*/
  /*  vertical-align: middle;*/
  /*  text-align: center;*/
  /*}*/

  /*.table-header-rotated th.rotate-45{*/
  /*  height: 80px;*/
  /*  width: 40px;*/
  /*  min-width: 40px;*/
  /*  max-width: 40px;*/
  /*  position: relative;*/
  /*  vertical-align: bottom;*/
  /*  padding: 0;*/
  /*  font-size: 12px;*/
  /*  line-height: 0.8;*/
  /*}*/

  /*.table-header-rotated th.rotate-45 > div{*/
  /*  position: relative;*/
  /*  top: 0px;*/
  /*  left: 40px; !* 80 * tan(45) / 2 = 40 where 80 is the height on the cell and 45 is the transform angle*!*/
  /*  height: 100%;*/
  /*  -ms-transform:skew(-90deg,0deg);*/
  /*  -moz-transform:skew(-90deg,0deg);*/
  /*  -webkit-transform:skew(-90deg,0deg);*/
  /*  -o-transform:skew(-90deg,0deg);*/
  /*  transform:skew(-90deg,0deg);*/
  /*  overflow: hidden;*/
  /*  border-left: 1px solid #dddddd;*/
  /*  border-right: 1px solid #dddddd;*/
  /*  border-top: 1px solid #dddddd;*/
  /*}*/

  /*.table-header-rotated th.rotate-45 span {*/
  /*  -ms-transform:skew(90deg,0deg) rotate(270deg);*/
  /*  -moz-transform:skew(90deg,0deg) rotate(270deg);*/
  /*  -webkit-transform:skew(90deg,0deg) rotate(270deg);*/
  /*  -o-transform:skew(90deg,0deg) rotate(270deg);*/
  /*  transform:skew(90deg,0deg) rotate(270deg);*/
  /*  position: absolute;*/
  /*  bottom: 30px; !* 40 cos(45) = 28 with an additional 2px margin*!*/
  /*  left: -25px; !*Because it looked good, but there is probably a mathematical link here as well*!*/
  /*  display: inline-block;*/
  /*  width: 85px; !* 80 / cos(45) - 40 cos (45) = 85 where 80 is the height of the cell, 40 the width of the cell and 45 the transform angle*!*/
  /*  text-align: left;*/
  /*}*/


</style>
