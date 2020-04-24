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
       v-model="del_dialog"
       max-width="500"
     >
    <template v-slot:activator="{ on }">
        <v-icon color="red lighten-2" v-on="on">mdi-delete-circle</v-icon>
    </template>

    <v-form
      ref="form"
    >
    <v-card>
      <v-card-title class="red white--text">
        <v-icon class="mr-1 white--text">mdi-delete-circle</v-icon> Confirm QC Key Deletion
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
            label="Scope"
            prepend-icon="mdi-area"
            required
            disabled
          ></v-text-field>
      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          color="red white--text"
          @click="confirmDelete"
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
    name: 'DeleteKey',
    props: {
      qckey: Object
    },
    data() {
      return {
        del_dialog: false,
        snackbar: false,
        status: '',
        timeout: 5000,
        comment: '',
      }
    },
    methods: {
      confirmDelete() {
        this.del_dialog = false;
        this.status = "Processing ...";
        this.snackbar = true;
        let self = this;
        this.$http.delete(`${this.$config.api}/qc_keywords/${this.qckey._id}`)
          .then(res => {
            self.snackbar = false;
            self.status = res.data.message;
            self.snackbar = true;
          }, err=> {
            self.snackbar = false;
            self.status = 'Error deleting QC Key!';
            self.snackbar = true;
            console.log(err);
          });
      }
    }
  }
</script>
