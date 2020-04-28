<template>
  <v-card class="qc_errorpanel elevation-6 ma-2">

    <v-list-item two-line>

      <v-list-item-avatar
        tile
        size="60"
      >
        <v-icon class="errorpanelicon erroricon" color="red" x-large v-if="type === 'error'">
          mdi-alert-circle
        </v-icon>
        <v-icon class="errorpanelicon warningicon" color="orange" v-if="type === 'warning'">
          mdi-alert-outline
        </v-icon>
        <v-icon class="errorpanelicon infoicon" color="blue lighten-2" v-if="type === 'info'">
          mdi-info-circle
        </v-icon>
      </v-list-item-avatar>

      <v-list-item-content>
        <div class="errordesc" v-if="error.type == 'image_count_mismatch' && error.tc > error.c">
          <v-list-item-title>{{error.tc - error.c}} image headers are missing</v-list-item-title>
          <v-list-item-subtitle>The template for this series contains {{error.tc}} images, but only {{error.c}} were found</v-list-item-subtitle>
        </div>
        <div class="errordesc" v-if="error.type == 'image_count_mismatch' && error.c >= error.tc">
          <v-list-item-title>{{error.c - error.tc - notemps}} image headers are duplicated</v-list-item-title>
          <v-list-item-subtitle>The template for this series contains {{error.tc}} images, but {{error.c - error.tc - notemps}} duplicate images were found</v-list-item-subtitle>
        </div>
        <div class="errordesc" v-if="error.type == 'not_set'">
          <v-list-item-title>{{error.c}} header fields are missing ({{error.per * 100 | round(2)}}%)</v-list-item-title>
          <v-list-item-subtitle>A total of {{error.c}} header fields that were present in the template were not found in the series image headers</v-list-item-subtitle>
        </div>
        <div class="errordesc" v-if="error.type == 'image_errors'">
          <v-list-item-title>{{error.c}} image headers contain QC errors ({{error.per * 100 | round(2)}}%)</v-list-item-title>
          <v-list-item-subtitle>Quality control errors have been found in {{error.c}} image headers.</v-list-item-subtitle>
        </div>
        <div class="errordesc" v-if="error.type == 'template_mismatch'">
          <v-list-item-title>{{error.c}} header fields contain QC errors ({{error.per * 100 | round(2)}}%)</v-list-item-title>
          <v-list-item-subtitle>A total of {{error.c}} quality control errors were found in all image header fields in this series.</v-list-item-subtitle>
        </div>
        <div class="errordesc" v-if="error.type == 'image_tag_mismatch'">
          <v-list-item-title>{{error.c}} excess header fields found </v-list-item-title>
          <v-list-item-subtitle>A total of {{error.c}} image header fields in this series are not present in the template series.</v-list-item-subtitle>
        </div>
        <div class="errordesc" v-if="error.type == 'image_warning'">
          <v-list-item-title>{{error.c}} image headers contain QC warnings</v-list-item-title>
          <v-list-item-subtitle>Quality control warnings have been found in {{error.c}} image headers.</v-list-item-subtitle>
        </div>
        <div class="errordesc" v-if="type == 'info'">
          <v-list-item-title>{{notemps}} excess images found</v-list-item-title>
          <v-list-item-subtitle>This series contains {{notemps}} image headers with no matching template image header</v-list-item-subtitle>
        </div>
      </v-list-item-content>
    </v-list-item>
  </v-card>
</template>

<script>
  export default {
    name: 'ErrorPanel',
    props: {
      error: Object,
      type: String,
      notemps: Number
    }
  }
</script>
