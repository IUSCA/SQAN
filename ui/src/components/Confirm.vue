<template>
  <span>
     <v-dialog
       v-model="con_dialog"
       max-width="500"
     >
    <template v-slot:activator="{ on }">
      <v-btn
        :color="color"
        dark
        x-small
        v-on="on"
      >
        <slot name="label"></slot>
      </v-btn>
    </template>

    <v-form
      ref="form"
    >
    <v-card>
      <v-card-title :class="color">
        <v-icon class="mr-1 white--text">mdi-help-circle</v-icon> {{title}}
      </v-card-title>
      <v-divider></v-divider>
      <v-card-text>
          {{message}}
      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          :color="color"
          @click="confirm"
        >
          Confirm
        </v-btn>
        <v-btn
          color="white red--text"
          @click="cancel"
        >
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
    name: 'Confirm',
    props: {
      title: String,
      message: String,
      color: String
    },
    data() {
      return {
        con_dialog: false,
      }
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
  }
</script>
