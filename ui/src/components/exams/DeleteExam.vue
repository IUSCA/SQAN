<template>
  <span>

     <v-dialog
       v-model="del_dialog"
       max-width="500"
     >
    <template v-slot:activator="{ on }" v-if="$store.getters.hasRole('admin')">
      <v-btn
        color="red lighten-2"
        dark
        x-small
        v-on="on"
      >
        <v-icon x-small class="mr-1">mdi-delete-circle</v-icon> Delete Exam
      </v-btn>
    </template>

    <v-form
      ref="form"
    >
    <v-card>
      <v-card-title class="red white--text">
        <v-icon class="mr-1 white--text">mdi-delete-circle</v-icon> Confirm Exam Deletion
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
    name: 'DeleteExam',
    props: {
      exam: Object
    },
    data() {
      return {
        del_dialog: false,
        comment: '',
      }
    },
    methods: {
      confirmDelete() {
        this.del_dialog = false;
        this.status = "Processing ...";
        this.snackbar = true;
        let self = this;
        this.$http.post(`${this.$config.api}/exam/delete/${this.exam._id}`, { comment: this.comment})
          .then(res => {
            self.$store.dispatch('snack', res.data.message);
          }, err=> {

            self.$store.dispatch('snack', 'Error deleting exam!');
            console.log(err);
          });
      }
    }
  }
</script>
