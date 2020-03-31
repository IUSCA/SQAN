<template>
  <div>
    <v-row>
      <v-col cols="5">
        <v-autocomplete
          v-model="selected"
          :items="research_ids"
          hide-no-data
          item-text="IIBISID"
          item-value="_id"
          label="Research IDs"
          prepend-icon="mdi-database-search"
          @change="updateDetail"
          return-object
        ></v-autocomplete>
      </v-col>

      <v-col cols="7">
        <ResearchDetail :research_id="selected.IIBISID" v-if="selected_id" />
      </v-col>
  </v-row>
    <v-row>
      <ResearchTable :research_id="selected._id" v-if="selected_id"/>
    </v-row>
  </div>
</template>

<script>

  import ResearchDetail from "../components/research/ResearchDetail";
  import ResearchTable from "../components/research/ResearchTable";

  export default {
    name: "ResearchSummary",
    components: {ResearchDetail, ResearchTable},
    data() {
      return {
        selected: {
          _id: null,
          IIBISID: null
        },
        selected_id: null,
        research_ids: [],
        model: null
      }
    },
    methods: {
      getResearches: function() {
        let self = this;
        this.$http.get(`${this.$config.api}/research?admin=true`)
          .then(function(res) {
            // console.log(res.data);
            self.research_ids = res.data;

            // //organize records into IIBISID / (Modality+StationName+Radio Tracer)
            // $scope.research_count = res.data.length;
            // $scope.iibisids = {};
            // res.data.forEach(function(rec) {
            //   if(!self.research_ids[rec.IIBISID]) self.$set(self.research_ids, rec.IIBISID, []);
            //   self.research_ids[rec.IIBISID].push(rec);
            // });
          }, function(err) {
            console.log(err);
          });
      },
      updateDetail: function() {
        this.selected_id = null;
        this.$nextTick(function() {
          this.selected_id = this.selected.IIBISID;
        });
      }
    },
    mounted() {
      this.getResearches();
    }
  };
</script>
