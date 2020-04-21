<template>
  <div class="QCKeys">

    <v-tabs v-model="tab">
      <v-tab v-for="(keys, mod) in sorted_keys" :key="mod">
        {{mod.toUpperCase()}}
        <v-chip class="ml-1" color="green" text-color="white">
          {{keys.length}}
        </v-chip>
      </v-tab>
      <v-tabs-items v-model="tab">
        <v-tab-item v-for="(keys, mod) in sorted_keys" :key="mod">
          <div class="headline mt-3">QC Scope: {{mod.toUpperCase()}}</div>
          <div class="container--fluid">
            <div style="width: 250px">
              <v-text-field
                v-model="search"
                append-icon="mdi-magnify"
                label="Search"
                single-line
                hide-details
              ></v-text-field>
            </div>
            <v-data-table
              :items="keys"
              :headers="headers"
              :search="search"
              hide-default-footer
              disable-pagination
            >

            </v-data-table>
          </div>
        </v-tab-item>
      </v-tabs-items>
    </v-tabs>
  </div>
</template>

<script>
  export default {
    name: "qc",
    computed: {
      sorted_keys() {
        let sorted = {};
        this.qckeys.forEach(k => {
          if(!(k.modality in sorted)) sorted[k.modality] = [];
          sorted[k.modality].push(k);
        })
        return sorted;
      }
    },
    data() {
      return {
        search: '',
        tab: 'common',
        qckeys: [],
        headers: [
          {
            text: 'QC Key',
            value: 'key',
            sortable: true
          },
          {
            text: 'Skip?',
            value: 'skip',
            sortable: true
          },
          {
            text: 'Last Updated',
            value: 'updatedAt',
            sortable: true
          },
        ]
      }
    },
    methods: {

      getQCKeys: function() {
        let self = this;
        this.$http.get(`${this.$config.api}/qc_keywords/allkeys`)
          .then( res => {
            console.log(res.data);
            self.qckeys = res.data;
          }, err => {console.log(err)});
      }
    },
    mounted() {
      this.getQCKeys();
    }
  };
</script>
