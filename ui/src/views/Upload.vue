<template>
  <div class="upload">
    <v-card class="report elevation-6 mb-6">
      <v-card-text>
        <v-row justify="center">
          <v-col cols="8">
            <v-form
              ref="form"
              v-model="valid"
            >


              <v-text-field
                v-model="ingestForm.path"
                label="Path to data (on server)"
                prepend-icon="mdi-folder"
              ></v-text-field>

              <v-text-field
                v-model="ingestForm.studyname"
                label="Study Name"
                prepend-icon="mdi-flask"
              ></v-text-field>

              <v-text-field
                v-model="ingestForm.subject"
                label="Subject"
                prepend-icon="mdi-account-circle"
              ></v-text-field>

              <v-divider class="my-2"></v-divider>

              <v-row justify="end">
                <v-btn color="success" class="mr-2" @click="submitIngest">Submit</v-btn>
              </v-row>

            </v-form>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <div class="headline">Previous Ingestions</div>
    <v-data-table :items="ingestions" :headers="headers"></v-data-table>
  </div>
</template>

<script>
  export default {
    name: 'Upload',
    data() {
      return {
        ingestForm:{
          path: '',
          studyname: '',
          subject: '',
        },
        ingestions: [],
        headers: [
          {
            text: 'Date',
            value: 'createDate',
            sortable: true
          },
          {
            text: 'Study Name',
            value: 'studyname',
            sortable: true
          },
          {
            text: 'Subject',
            value: 'subject',
            sortable: true
          },
          {
            text: 'Path',
            value: 'path',
            sortable: true
          },
          {
            text: 'User',
            value: 'user.fullname',
            sortable: true
          }
        ]
      }
    },
    methods: {
      submitIngest: function() {
        let self = this;
        this.$http.post(`${this.$config.api}/ingest/`, this.ingestForm)
          .then( res => {
            console.log(res.data);
            self.$store.dispatch('snack', 'Ingestion request submitted');
            self.getPrior();
          }, err => self.$store.dispatch('snack', err));
      },
      getPrior: function() {
        let self = this;
        this.ingestions = [];
        this.$http.get(`${this.$config.api}/ingest/all`)
          .then( res => {
            console.log(res.data);
            self.ingestions = res.data;
          }, err => {console.log(err)});
      }
    },
    mounted() {
      this.getPrior();
    }
  }
</script>

<style>

</style>
