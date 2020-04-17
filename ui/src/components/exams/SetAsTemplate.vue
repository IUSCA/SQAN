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
        color="orange lighten-2"
        dark
        x-small
        v-on="on"
        :disabled="exam.converted_to_template"
      >
        <v-icon x-small class="mr-1">mdi-checkbox-multiple-blank</v-icon> Add as Template
      </v-btn>
    </template>

    <v-form
      ref="form"
    >
    <v-card>
      <v-card-title class="orange lighten-2">
        <v-icon class="mr-1">mdi-check-box-multiple-outline</v-icon> Confirm using this Exam as a Template
      </v-card-title>
      <v-divider></v-divider>
      <v-card-text>
          <v-text-field
            v-model="exam.subject"
            label="Subject"
            prepend-icon="mdi-account"
            required
            disabled
          ></v-text-field>

          <v-text-field
            v-model="exam.StudyTimestamp"
            label="Timestamp"
            prepend-icon="mdi-clock"
            required
            disabled
          ></v-text-field>

          <v-textarea
            v-model="comment"
            label="Comment"
            prepend-icon="mdi-comment"
            rows="2"
            required
          ></v-textarea>
      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          @click="makeTemplate"
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
    name: 'SetAsTemplate',
    props: {
      exam: Object
    },
    data() {
      return {
        sat_dialog: false,
        snackbar: false,
        status: '',
        timeout: 5000,
        comment: ''
      }
    },
    methods: {
      makeTemplate() {
        this.sat_dialog = false;
        this.status = "Processing ...";
        this.snackbar = true;
        let self = this;
        this.$http.post(`${this.$config.api}/exam/maketemplate/${this.exam._id}`, { comment: this.comment})
          .then(res => {
            self.snackbar = false;
            self.status = res.data.message;
            self.snackbar = true;
          }, err=> {
            self.snackbar = false;
            self.status = 'Error marking exam as template!';
            self.snackbar = true;
            console.log(err);
          });
      }
    }
  }
</script>
