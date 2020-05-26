<template>
  <div class="QCKeys">

    <AddKey @newkey="getQCKeys"></AddKey>
    <ScanDB @newkey="getQCKeys"></ScanDB>

    <v-divider class="my-2"></v-divider>
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
              dense
              disable-pagination
            >
              <template v-slot:item.actions="{ item }">
                <DeleteKey :qckey="item" @deleted="getQCKeys"></DeleteKey>
              </template>
              <template v-slot:item.updatedAt="{ item }">
                {{item.updatedAt | moment('from')}}
              </template>
              <template v-slot:item.skip="{ item }">
                <v-simple-checkbox :ripple="false" @input="updateKey(item)"
                        v-model="item.skip"
                ></v-simple-checkbox>
              </template>
              <template v-slot:item.custom="{ item }">
                <v-simple-checkbox :ripple="false" @input="updateKey(item)"
                                   v-model="item.custom"
                ></v-simple-checkbox>
              </template>
            </v-data-table>
          </div>
        </v-tab-item>
      </v-tabs-items>
    </v-tabs>
  </div>
</template>

<script>

  import DeleteKey from "../components/qckeys/DeleteKey";
  import AddKey from "../components/qckeys/AddKey";
  import ScanDB from "../components/qckeys/ScanDB";

  export default {
    name: "qc",
    components: {DeleteKey, AddKey, ScanDB},
    computed: {
      sorted_keys() {
        let sorted = {};
        this.qckeys.forEach(k => {
          if(!(k.modality in sorted)) sorted[k.modality] = [];
          sorted[k.modality].push(k);
        });
        return sorted;
      }
    },
    data() {
      return {
        search: '',
        tab: 'common',
        qckeys: [],
        toggle_exclusive: false,
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
            text: 'Custom Handler?',
            value: 'custom',
            sortable: true
          },
          {
            text: 'Last Updated',
            value: 'updatedAt',
            sortable: true
          },
          {
            text: 'Actions',
            value: 'actions',
            sortable: false
          }
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
      },
      updateKey: function(key) {
        this.$http.patch(`${this.$config.api}/qc_keywords/update/${key._id}`, key)
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

<style>

</style>
