<template>
  <div class="QCKeys">

    <AddKey></AddKey>
    <ScanDB></ScanDB>
    <Confirm title="Stuff" message="Other Stuff Here" v-on:confirm="doConfirm">
      <template v-slot:label>
        Stuff
      </template>
    </Confirm>

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
              disable-pagination
            >
              <template v-slot:item.actions="{ item }">
                <DeleteKey :qckey="item"></DeleteKey>
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
  import Confirm from "../components/Confirm";

  export default {
    name: "qc",
    components: {DeleteKey, AddKey, ScanDB, Confirm},
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
      doConfirm: function() {
        console.log("Got a confirmation");
      }
    },
    mounted() {
      this.getQCKeys();
    }
  };
</script>
