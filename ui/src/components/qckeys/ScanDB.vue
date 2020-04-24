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


      <v-divider></v-divider>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          color="success"
          @click="newKey"
        >
          Confirm
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
        timeout: 5000,
        newkeys: []
      }
    },
    methods: {
      scanDB() {
        this.sat_dialog = false;
        this.status = "Processing ...";
        this.snackbar = true;
        let self = this;
        this.$http.post(`${this.$config.api}/qc_keywords/`, this.qckey)
          .then(res => {
            self.snackbar = false;
            self.status = res.data.message;
            self.snackbar = true;
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
