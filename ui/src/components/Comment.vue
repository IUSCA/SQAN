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
       v-model="dialog"
       max-width="500"
     >
    <template v-slot:activator="{ on }">
      <v-btn
        color="grey lighten-2 text-black"
        x-small
        v-on="on"
      >
        <v-icon x-small class="mr-1">mdi-comment-text-outline</v-icon> Add Comment
      </v-btn>
    </template>

    <v-form
      ref="form"
    >
    <v-card>
      <v-card-title class="grey lighten-2">
        <v-icon class="mr-1">mdi-comment-text-outline</v-icon> Add Comment
      </v-card-title>
      <v-divider></v-divider>
      <v-card-text>


        <v-textarea
          label="Comment"
          rows="2"
          v-model="comment"
          hint="Comment on series data or QC status"
        ></v-textarea>

      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          @click="submitComment"
        >
          Submit
        </v-btn>
      </v-card-actions>

    </v-card>
    </v-form>
  </v-dialog>
  </span>
</template>

<script>

  export default {
    name: 'Comment',
    props: {
      series_id: String
    },
    data() {
      return {
        dialog: false,
        snackbar: false,
        status: '',
        timeout: 5000,
        comment: ''
      }
    },
    methods: {
      submitComment() {
        this.dialog = false;
        this.status = "Processing ...";
        this.snackbar = true;
        let self = this;
        this.$http.post(`${this.$config.api}/series/comment/${this.series_id}`, { comment: this.comment})
          .then(res => {
            self.$emit("submitted");
            self.snackbar = false;
            self.status = res.data.message;
            self.snackbar = true;
          }, err=> {
            self.snackbar = false;
            self.status = 'Error submitting comment!';
            self.snackbar = true;
            console.log(err);
          });
      },
    },
    mounted() {

    }
  }
</script>
