<template>
  <span>
     <v-dialog
       v-model="sat_dialog"
       max-width="500"
     >
    <template v-slot:activator="{ on }">
      <v-btn
        color="blue lighten-2"
        dark
        x-small
        v-on="on"
      >
        <v-icon x-small class="mr-1">mdi-cube-scan</v-icon> Scan Database
      </v-btn>
    </template>

    <v-form
      ref="form"
    >
    <v-card>
      <v-card-title class="blue lighten-2">
        <v-icon class="mr-1">mdi-cube-scan</v-icon> Scan Database
      </v-card-title>
      <v-divider></v-divider>
        <v-progress-circular
                v-show="loading"
                :size="50"
                color="primary"
                indeterminate
        ></v-progress-circular>
      <v-data-table
        v-show="newkeys.length"
        :items="newkeys"
        :headers="headers"
        show-select
        item-key="key"
        v-model="selected"
        disable-pagination
        hide-default-footer
        dense>
      </v-data-table>
<!--        <v-list dense>-->
<!--          <v-list-item v-for="k in newkeys" :key="k">-->
<!--            <v-list-item-action>-->
<!--              <v-simple-checkbox :ripple="false"-->
<!--              ></v-simple-checkbox>-->
<!--            </v-list-item-action>-->

<!--            <v-list-item-content>-->
<!--              <v-list-item-title>{{k}}</v-list-item-title>-->
<!--            </v-list-item-content>-->
<!--          </v-list-item>-->
<!--        </v-list>-->
      <v-divider></v-divider>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
                v-show="!newkeys.length"
          color="success"
          @click="scanDB"
        >
          Scan Image Database for Unregistered QC Keys
        </v-btn>
        <v-btn
                v-show="newkeys.length"
                color="success"
                @click="addSelected"
                :disabled="!newkeys.length"
        >
          Add {{selected.length}} Selected Keys to QC Database
        </v-btn>
      </v-card-actions>

    </v-card>
    </v-form>
  </v-dialog>
  </span>
</template>

<script>

  export default {
    name: 'ScanDB',
    data() {
      return {
        sat_dialog: false,
        loading: false,
        newkeys: [],
        selected: [],
        headers: [
          {
            text: 'Key',
            value: 'key',
            sortable: true
          }
        ]
      }
    },
    methods: {
      scanDB() {
        this.loading = true;

        let self = this;
        this.$http.get(`${this.$config.api}/qc_keywords/scandb`)
          .then(res => {

            self.loading = false;
            // self.newkeys = res.data;
            self.newkeys = res.data.map(k => {
              return {key: k}
            });
            console.log(res.data);

          }, err=> {
            self.snackbar = false;
            self.status = 'Error scanning database';
            self.snackbar = true;
            console.log(err);
          });
      },
      addSelected() {
        console.log(this.selected);
        let self = this;

        this.selected.forEach(k => {
          let data = {
            key: k.key,
            modality: 'common',
            skip: true
          };
          this.$http.post(`${this.$config.api}/qc_keywords/`, data)
            .then(res => {
              console.log(res.data);
              self.$store.dispatch('snack', `Added keyword ${k.key}`);
              self.$emit('newkey');
            }, err=> {
              console.log(err);
            });
        });

        this.sat_dialog = false;
      }
    }
  }
</script>
