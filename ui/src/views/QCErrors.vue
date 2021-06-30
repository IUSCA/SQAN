<template>
  <div>
    <v-spacer></v-spacer>
    <v-row>
      <v-col cols="4">
        <v-text-field
            v-model="search"
            append-icon="mdi-magnify"
            label="Search"
            single-line
            hide-details
            small
        ></v-text-field>
      </v-col>
    </v-row>


    <v-data-table
        :headers="headers"
        :items="qcerrors"
        dense
        show-expand
        :search="search"
        :loading="topload"
        loading-text="Counting and sorting errors..."
        :expanded.sync="expanded"
        item-key="key"
        sort-by="series_count"
        :sort-desc="true"
        disable-pagination
        hide-default-footer
        @item-expanded="getErrorDetails"
    >
      <template v-slot:item.valid="{ item }">
      <span v-if="!valid.includes(item.key)">
        <v-icon color="danger">mdi-alert</v-icon>
      </span>
      </template>

      <template v-slot:item.earliest="{ item }">
        {{`${item.earliest}` | moment("YYYY-MM-DD")}}
      </template>

      <template v-slot:item.latest="{ item }">
        {{`${item.latest}` | moment("YYYY-MM-DD")}}
      </template>

      <template v-slot:expanded-item="{ headers, item }">
        <td :colspan="headers.length" class="pb-4 ma-1">
          <v-data-table
              class="my-1 mx-2"
              :headers="detail_headers"
              :items="qcdetails[item.key]"
              dense
              :loading="qcdetails[item.key] === undefined"
              loading-text="Loading details, please wait"
              show-expand
              sort-by="subjects"
              item-key="IIBISID"
              :sort-desc="true"
              disable-pagination
              hide-default-footer
          >
            <template v-slot:item.subjects="{ item }">
              {{item.subjects.length}}
            </template>

            <template v-slot:expanded-item="{ headers, item }">
              <td :colspan="headers.length" class="pb-4">
                <v-data-table
                    class="my-1 mx-2"
                    :headers="subject_headers"
                    :items="item.subjects"
                    dense
                    disable-pagination
                    hide-default-footer
                >
                  <template v-slot:item.timestamp="{ item }">
                    {{item.timestamp | moment('YYYY-MM-DD')}}
                  </template>

                  <template v-slot:item.open="{ item }">
                    <router-link :to="{ name: 'exams', query: {series: item.series_id}}" target="_blank">
                      <v-icon color="info">mdi-open-in-new</v-icon>
                    </router-link>
                  </template>
                </v-data-table>
              </td>
            </template>
          </v-data-table>
        </td>
      </template>
    </v-data-table>
  </div>
</template>

<script>
  export default {
    name: 'QCErrors',
    data() {
      return {
        headers: [
          {
            text: '',
            value: 'valid',
            sortable: true
          },
          {
            text: 'QC Key',
            value: 'key',
            sortable: true,
          },
          {
            text: 'Series Affected',
            value: 'series_count',
            sortable: true
          },
          {
            text: 'First Error',
            value: 'earliest',
            sortable: true
          },
          {
            text: 'Most Recent Error',
            value: 'latest',
            sortable: true
          }
        ],
        detail_headers: [
          {
            text: 'IIBISID',
            value: 'IIBISID',
            sortable: true,
            class: "blue lighten-5"
          },
          {
            text: 'Series',
            value: 'subjects',
            sortable: true,
            class: "blue lighten-5"
          }
        ],
        subject_headers: [
          {
            text: 'Subject',
            value: 'subject',
            sortable: true,
            class: "green lighten-5"
          },
          {
            text: 'Date',
            value: 'timestamp',
            sortable: true,
            class: "green lighten-5"
          },
          {
            text: 'Series Desc',
            value: 'series',
            sortable: true,
            class: "green lighten-5"
          },
          {
            text: '',
            value: 'open',
            sortable: false,
            class: "green lighten-5"
          }
        ],
        qcerrors: [],
        qcdetails: {},
        expanded: [],
        valid: [],
        topload: false,
        search: ''
      }
    },
    methods: {
      getQCErrors: function() {
        let self = this;
        this.topload = true;
        this.$http.get(`${this.$config.api}/qc_keywords/errorcount`)
          .then( res => {
            console.log(res.data);
            self.qcerrors = res.data;
            this.topload = false;
          }, err => {console.log(err)});
      },
      getValid: function() {
        let self = this;
        this.$http.get(`${this.$config.api}/qc_keywords/allkeys`)
          .then( res => {
            console.log(res.data);
            self.valid = res.data.map(k => {
              return k.key;
            });
          }, err => {console.log(err)});
      },
      getErrorDetails: function(row) {
        let keyword = row.item.key;
        let self = this;
        this.$http.get(`${this.$config.api}/qc_keywords/affected/${keyword}`)
          .then( res => {
            console.log(res.data);
            self.$set(self.qcdetails, keyword, res.data);
          }, err => {console.log(err)});
      },
    },
    mounted() {
      this.getValid();
      this.getQCErrors();
    }
  }
</script>
