<template>
  <div>
    <v-row>
      <v-col cols="5">
        <v-autocomplete
          v-model="selected"
          :items="research_ids"
          hide-no-data
          :item-text="researchLabel"
          item-value="IIBISID"
          label="Research IDs"
          prepend-icon="mdi-database-search"
          @change="updateDetail"
          return-object
        ></v-autocomplete>

        <div v-show="selected_id">
          <v-text-field
            v-model="searchSeries"
            prepend-icon="mdi-filter"
            label="Series"
            single-line
            hide-details
          ></v-text-field>

          <v-text-field
            v-model="searchSubject"
            prepend-icon="mdi-filter"
            label="Subject"
            single-line
            hide-details
          ></v-text-field>

        </div>
      </v-col>

      <v-col cols="7">

        <ResearchDetail :research_id="selected.IIBISID" v-if="selected_id" />
      </v-col>
  </v-row>
    <v-row v-if="selected_id">

      <v-col cols="12">
        <v-divider></v-divider>
        <ResearchTable :research="selected" v-if="selected_id" :series_filter="searchSeries" :subject_filter="searchSubject"/>
      </v-col>
    </v-row>
  </div>
</template>

<script>

  import ResearchDetail from "../components/research/ResearchDetail";
  import ResearchTable from "../components/research/ResearchSummaryTable";

  export default {
    name: "ResearchSummary",
    components: {ResearchDetail, ResearchTable},
    data() {
      return {
        selected: {
          IIBISID: null
        },
        selected_id: null,
        research_ids: [],
        model: null,
        searchSeries: '',
        searchSubject: '',
      }
    },
    methods: {
      researchLabel: function(research) {
        if(research.researches === undefined) return '';
        let modalities = [];
        research.researches.forEach(r => {
          modalities.push(r.Modality);
        });

        return `${research.IIBISID} (${modalities.join(' | ')})`
      },
      getResearches: function() {
        let self = this;
        this.$http.get(`${this.$config.api}/research?admin=true`)
          .then(function(res) {
            // console.log(res.data);
            //self.research_ids = res.data;

            // //organize records into IIBISID / (Modality+StationName+Radio Tracer)
            // $scope.research_count = res.data.length;
            // $scope.iibisids = {};
            let tmp_res = {};
            res.data.forEach(function(rec) {
              if(!tmp_res[rec.IIBISID]) self.$set(tmp_res, rec.IIBISID, { IIBISID: rec.IIBISID, researches: []});
              tmp_res[rec.IIBISID].researches.push(rec);
            });

            self.research_ids = Object.values(tmp_res);
          }, function(err) {
            console.log(err);
          });
      },
      updateDetail: function() {
        this.selected_id = null;
        this.$nextTick(function() {
          this.selected_id = this.selected.IIBISID;
        });
      },
    },
    mounted() {
      this.getResearches();
    }
  };
</script>
