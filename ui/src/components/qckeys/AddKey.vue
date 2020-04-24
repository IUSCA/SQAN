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
        color="green"
        dark
        x-small
        v-on="on"
      >
        <v-icon x-small class="mr-1">mdi-plus-circle</v-icon> Add QC Keyword
      </v-btn>
    </template>

    <v-form
      ref="form"
    >
    <v-card>
      <v-card-title class="green">
        <v-icon class="mr-1">mdi-plus-circle</v-icon> Create New QC Keyword
      </v-card-title>
      <v-divider></v-divider>
      <v-card-text>
          <v-text-field
            v-model="qckey.key"
            label="Key"
            prepend-icon="mdi-key"
            required
            disabled
          ></v-text-field>

          <v-text-field
            v-model="qckey.modality"
            label="Timestamp"
            prepend-icon="mdi-clock"
            required
            disabled
          ></v-text-field>
      </v-card-text>

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
    name: 'AddKey',
    data() {
      return {
        sat_dialog: false,
        snackbar: false,
        status: '',
        timeout: 5000,
        qckey: {
          'key': '',
          'modality': ''
        }
      }
    },
    methods: {
      newKey() {
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
            self.status = 'Error creating new QC Key';
            self.snackbar = true;
            console.log(err);
          });
      }
    }
  }
</script>
