<template>
  <span>
    <v-dialog v-model="con_dialog" max-width="500">
      <template v-slot:activator="{ on }">
        <span v-on="on">
        <slot name="label">
          <v-btn color="red lighten-2" dark x-small> </v-btn>
        </slot>
        </span>
      </template>

      <v-form ref="form">
        <v-card>
          <v-card-title class="red white--text">
            <v-icon class="mr-1 white--text">mdi-help-circle</v-icon>
            {{ title }}
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text>
            {{ message }}
          </v-card-text>

          <v-divider></v-divider>

          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="red white--text" @click="confirm">
              Confirm
            </v-btn>
            <v-btn color="white red--text" @click="cancel">
              Cancel
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-form>
    </v-dialog>
  </span>
</template>

<script>
export default {
  name: "Confirm",
  props: {
    title: String,
    message: String
  },
  data() {
    return {
      con_dialog: false,
      snackbar: false,
      status: "",
      timeout: 5000,
      comment: ""
    };
  },
  methods: {
    confirm() {
      this.con_dialog = false;
      this.$emit("confirm");
    },
    cancel() {
      this.con_dialog = false;
      this.$emit("cancel");
    }
  }
};
</script>
