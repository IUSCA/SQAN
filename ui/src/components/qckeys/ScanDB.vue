<template>
  <span>
    <v-snackbar
      v-model="snackbar"
      top
      right
      :timeout="timeout"
    >
      {{status}}
      <v-btn
        color="red"
        text
        @click="snackbar = false"
      >
        Close
      </v-btn>
    </v-snackbar>
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
        <v-list dense>
          <v-list-item v-for="k in newkeys" :key="k">
            <v-list-item-action>
              <v-simple-checkbox :ripple="false"
              ></v-simple-checkbox>
            </v-list-item-action>

            <v-list-item-content>
              <v-list-item-title>{{k}}</v-list-item-title>
            </v-list-item-content>
          </v-list-item>
        </v-list>
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
                @click="scanDB"
        >
          Add Selected Keys to QC Database
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
        snackbar: false,
        status: '',
        loading: false,
        timeout: 5000,
        newkeys: []
      }
    },
    methods: {
      scanDB() {
        this.loading = true;

        let self = this;
        this.$http.get(`${this.$config.api}/qc_keywords/scandb`)
          .then(res => {

            self.loading = false;
            self.newkeys = res.data;

          }, err=> {
            self.snackbar = false;
            self.status = 'Error scanning database';
            self.snackbar = true;
            console.log(err);
          });
      }
    }
  }
</script>
