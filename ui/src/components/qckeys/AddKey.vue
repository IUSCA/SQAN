<template>
  <span>
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
          ></v-text-field>

          <v-select
            v-model="qckey.modality"
            :items="modalities"
            label="Modality"
            outlined
          ></v-select>
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
        modalities: ['common','MR','CT','PT'],
        qckey: {
          'key': '',
          'modality': ''
        }
      }
    },
    methods: {
      newKey() {
        this.sat_dialog = false;
        let self = this;
        this.$http.post(`${this.$config.api}/qc_keywords/`, this.qckey)
          .then(res => {
            console.log(res.data);
            self.$store.dispatch('snack', 'New Key Added');
            self.$emit('newkey');
          }, err=> {
            self.$store.dispatch('snack', err);
          });
      }
    }
  }
</script>
