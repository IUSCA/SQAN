<template>
  <div class="QCKeys">

    <div style="width: 250px">
      <v-text-field
        v-model="search"
        append-icon="mdi-magnify"
        label="Search"
        single-line
        hide-details
      ></v-text-field>
    </div>

    <v-data-table :items="qckeys" :headers="headers" :search="search">

    </v-data-table>
  </div>
</template>

<script>
  export default {
    name: "qc",
    data() {
      return {
        search: '',
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
