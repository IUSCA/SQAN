<template>
  <div>
  <v-row>
    <v-col cols="5">
      <v-autocomplete
        v-model="selected"
        :items="research_ids"
        :loading="isLoading"
        color="white"
        hide-no-data
        item-text="IIBISID"
        item-value="_id"
        label="Research IDs"
        placeholder="Start typing to Search"
        prepend-icon="mdi-database-search"
        @change="getDetail"
        return-object
      ></v-autocomplete>
    </v-col>

    <v-col cols="7">
      <ResearchDetail :research="selected_detail" v-if="selected_detail" />
    </v-col>
  </v-row>
  </div>
</template>

<script>

  import ResearchDetail from "../components/research/ResearchDetail";
  export default {
    name: "ResearchSummary",
    components: {ResearchDetail},
    data() {
      return {
        isLoading: false,
        selected: null,
        selected_detail: null,
        research_ids: [],
        model: null
      }
    },
    methods: {
      getResearches: function() {
        let self = this;
        this.$http.get(`${this.$config.api}/research?admin=true`)
          .then(function(res) {
            console.log(res.data);
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
      getDetail: function() {
        this.isLoading = true;
        let url = `${this.$config.api}/iibis/${this.selected.IIBISID}`;
        console.log(url);
        let self = this;
        this.$http.get(url)
          .then(function(res) {
            self.selected_detail = res.data[0];
            console.log(res.data);
            self.isLoading = false;
          }, function(err) {
            console.log(err);
          });
      }
    },
    mounted() {
      this.getResearches();
    }
  };
</script>
