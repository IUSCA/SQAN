<template>
  <div class="dataflow">

    <div >Previous <v-text-field
      class="ml-1"
      v-model="daysAgo"
      type="number"
      style="width: 45px"
      @change="getDataflows"
    ></v-text-field> days acquisitions/transfers</div>
    <v-data-table
      :items="dataflows"
      :headers="headers"
      dense
      show-expand
      :expanded.sync="expanded"
      item-key="_id"
      disable-pagination
      hide-default-footer
    >
      <template v-slot:item.expected_count="{ item }">
        <v-chip small :color="countColor(item.received_count, item.expected_count)">
          {{item.received_count}} / {{item.expected_count}}
        </v-chip>
      </template>
      <template v-slot:expanded-item="{ headers, item }">
        <td :colspan="headers.length" class="pb-4">
          <span v-for="s in item.series" :key="s.series_number">
            <seriesBlock :series="s" :received="item.received[s.series_number]"></seriesBlock>
          </span>
        </td>
      </template>
    </v-data-table>
  </div>
</template>

<script>

  import seriesBlock from "../components/dataflow/seriesBlock";
  export default {
    name: "dataflow",
    components: {seriesBlock},
    data() {
      return {
        search: '',
        daysAgo: 30,
        dataflows: [],
        expanded: [],
        headers: [
          {
            text: 'Study Timestamp',
            value: 'date',
            sortable: true
          },
          {
            text: 'IIBIS',
            value: 'iibis',
            sortable: true
          },
          {
            text: 'Modality',
            value: 'modality',
            sortable: true
          },
          {
            text: 'Station Name',
            value: 'station_name',
            sortable: true
          },
          {
            text: 'Subject',
            value: 'subject',
            sortable: true
          },
          {
            text: 'Series Count',
            value: 'series_count',
            sortable: true
          },
          {
            text: 'Image Count',
            value: 'expected_count',
            sortable: true
          }
        ]
      }
    },
    methods: {

      getDataflows: function() {
        let self = this;
        this.dataflows = [];
        this.$http.get(`${this.$config.api}/dataflow/recent/${this.daysAgo}`)
          .then( res => {
            console.log(res.data);

            res.data.forEach(ds => {
              ds['series_count'] = ds.series.length;
              ds['received'] = {};
              ds['received_count'] = 0;
              ds['expected_count'] = 0;
              ds.series.forEach(function(s) {
                ds['expected_count'] += s.image_count;
              });

              self.$http.get(`${self.$config.api}/dataflow/imgcount?iibis=${ds.iibis}&subject=${ds.subject}&StudyTimestamp=${ds.date}`)
                .then( _res => {
                  ds.received = _res.data;
                  Object.keys(_res.data).forEach( key => {
                    ds.received_count += _res.data[key];
                  });
                  self.dataflows.push(ds);
                }, err => {console.log(err)})

            });
          }, err => {console.log(err)});
      },
      countColor: function(num, den) {
        if(num == den) return 'light-green';
        if(num == 0) return 'orange';
        if(num < den) return 'red lighten-1';
      }
    },
    mounted() {
      this.getDataflows();
    }
  };
</script>

<style>
  .v-input {
    display: inline-block;
  }
</style>
