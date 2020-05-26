<template>
  <span>

     <v-dialog
             v-model="req_dialog"
             max-width="500"
     >
    <template v-slot:activator="{ on }">
      <v-btn
              color="green lighten-2"
              dark
              x-small
              v-on="on"
      >
        <v-icon x-small class="mr-1">mdi-file-chart</v-icon> Frame Duration Report
      </v-btn>
    </template>

    <v-card>
      <v-card-title class="green lighten-2">
        <v-icon class="mr-1">mdi-file-chart</v-icon> Frame Duration Report
      </v-card-title>
      <v-divider></v-divider>

      <v-card-text v-if="report.length">

          <v-data-table
              dense
              :items="report"
              :headers="fields"
              disable-pagination
              hide-default-footer
          ></v-data-table>

      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
                v-show="!report.length"
                color="primary"
                @click="getReport"
        >
          Get Report
        </v-btn>
      </v-card-actions>

    </v-card>
  </v-dialog>
  </span>
</template>

<script>

    export default {
        name: 'FrameReport',
        props: {
            series_id: String
        },
        data() {
            return {
                report: [],
                fields: [
                    {text: 'Frame #', value: 'frame'},
                    {text: 'Start (s)', value: 'start_time'},
                    {text: 'End (s)', value: 'end_time'},
                    {text: 'Duration (s)', value: 'duration'}
                ]
            }
        },
        computed: {

        },
        methods: {
            getReport() {

                let self = this;
                self.$store.dispatch('snack', 'Getting Frame Duration Report');

                this.$http.get(`${self.$config.api}/series/frame_report/${self.series_id}`)
                    .then(res => {
                        self.report = res.data;
                        console.log(res.data);
                        self.$emit('reqc');
                    }, err=> {
                        self.$store.dispatch('snack', 'Error getting frame duration report!');
                        console.log(err);
                    });
            },

        }
    }
</script>
