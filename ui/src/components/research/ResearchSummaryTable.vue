<template>
  <v-simple-table>
    <template v-slot:default>
    <table class="table table-scroll table-condensed">
      <thead>
        <th>Series</th>
        <th
          class="text-muted"
          v-for="sub in filtered_subjects"
          :key="sub"
        >
              {{sub}}
        </th>
      </thead>
      <tbody>
        <tr v-for="sd in filtered_series" :key="sd">
          <td><span class="pull-right">{{sd}}&nbsp;&nbsp;</span></td>
          <td style="white-space:nowrap" v-for="sub in filtered_subjects" :key="sub">
            <span
              v-for="exam in research.exams[sub]"
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
</template>

<script>

  import SeriesBox from "./SeriesBox";

  export default {
    name: 'ResearchSummaryTable',
    components: {SeriesBox},
    props: {
      research_id: String,
      series_filter: String,
      subject_filter: String
    },
    computed: {
      filtered_subjects() {
        return this.research.subjects.filter(rs => {
          if(this.subject_filter.length && !rs.includes(this.subject_filter)) return false;
          return true;
        })
      },
      filtered_series() {
        return this.research.series_desc.filter(sd => {
          if(this.series_filter.length && !sd.includes(this.series_filter)) return false;
          return true;
        })
      }
    },
    data() {
      return {
        research: {
          series_desc: [],
          subjects: [],
          exams: {}
        }
      }
    },
    methods: {
      getSummary: function() {
        let self = this;
        this.$http.get(`${this.$config.api}/research/summary/${self.research_id}`)
          .then(function(res) {
            console.log(res.data);
            self.research = res.data;
          }, (err) => {
            console.log(err)
          });
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
