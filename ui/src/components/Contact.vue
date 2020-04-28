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
        color="blue lighten-2"
        dark
        x-small
        v-on="on"
      >
        <v-icon x-small class="mr-1">mdi-email-edit</v-icon> Contact PI
      </v-btn>
    </template>

    <v-form
      ref="form"
    >
    <v-card>
      <v-card-title class="blue lighten-2">
        <v-icon class="mr-1">mdi-email-edit</v-icon> Send Message to Research PI
      </v-card-title>
      <v-divider></v-divider>
      <v-card-text>


          <v-text-field
            v-model="form.from"
            label="From"
            prepend-icon="mdi-account"
            required
            disabled
          ></v-text-field>

        <v-text-field
          v-model="form.to"
          label="To"
          prepend-icon="mdi-account"
          required
          disabled
        ></v-text-field>

        <v-text-field
          v-model="form.subject"
          label="Subject"
          prepend-icon="mdi-email"
          required
        ></v-text-field>

        <v-textarea
          label="Message"
          rows="15"
          v-model="form.message"
          hint="Message to send to PI"
        ></v-textarea>

      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          @click="submitMessage"
        >
          Send
        </v-btn>
      </v-card-actions>

    </v-card>
    </v-form>
  </v-dialog>
  </span>
</template>

<script>

  export default {
    name: 'Contact',
    props: {
      exam: Object,
      series: Object
    },
    data() {
      return {
        dialog: false,
        snackbar: false,
        status: '',
        timeout: 5000,
        form: {
          name: '',
          from: '',
          to: '',
          subject: '',
          message: '',
        }
      }
    },
    methods: {
      submitMessage() {
        this.dialog = false;
        this.status = "Processing ...";
        this.snackbar = true;
        // let self = this;
        // this.$http.post(`${this.$config.api}/exam/reqc/${this.exam._id}`, { comment: this.comment})
        //   .then(res => {
        //     self.snackbar = false;
        //     self.status = res.data.message;
        //     self.snackbar = true;
        //   }, err=> {
        //     self.snackbar = false;
        //     self.status = 'Error marking exam as template!';
        //     self.snackbar = true;
        //     console.log(err);
        //   });
      },

      prepForm() {
        let self = this;

        this.form.subject = `Query on Subject ${this.exam.subject}`;

        this.$http.get(`${this.$config.api}/user/self`)
          .then(res => {

            self.form.from = `${res.data.user.fullname} (${res.data.user.email})`;

            self.$http.get(`${self.$config.api}/iibis/${self.exam.research_id.IIBISID}`)
              .then(function(rs) {
                let pi = rs.data[0];
                self.form.to = `${pi.pi_first_name} ${pi.pi_last_name} (${pi.email_address})`

                self.form.message = 'IIBISID: '+ self.exam.research_id.IIBISID +'\n' +
                  'SUBJECT: '+self.exam.subject+'\n' +
                  'STUDY TIMESTAMP: '+self.exam.StudyTimestamp+'\n' +
                  'SERIES DESCRIPTION: '+self.series.series_desc

                // if ($scope.data.series.qc1_state != "no template") {
                //   $scope.comment_form.message = $scope.comment_form.message + '\n' +
                //     'TEMPLATE USED: '+ $scope.data.template.exam_id.StudyTimestamp
                // }

                self.form.message = self.form.message + '\n' +
                  'QC-STATUS: '+ self.series.qc1_state+'\n'

                self.form.message = self.form.message+ `
            Dear ${pi.pi_first_name} ${pi.pi_last_name},

            I have the following query about this dataset:




            Kind regards,
            ${res.data.user.fullname}`;

              }, function(err) {
                console.log(err);
              });

          }, err=> {
            self.snackbar = false;
            self.status = 'Error retrieving user profile';
            self.snackbar = true;
            console.log(err);
          });

      }
    },
    mounted() {
      this.prepForm();
    }
  }
</script>
