<template>
  <v-container fluid>
    <v-row>
      <v-col cols="8">
        <v-img src="../assets/sqan_logo_full.png" contain></v-img>
      </v-col>
      <v-col cols="4">
        <v-row>
          <v-img src="../assets/partner_logos.png"></v-img>
        </v-row>
        <v-row>
          <div class="caption font-weight-light">
            SQAN is an open-source project developed and in production use by Indiana University, with prototype deployments at Harvard University and Dartmouth College
          </div>
        </v-row>
      </v-col>
    </v-row>
    <v-row>

      <v-card
        class="elevation-4 mb-4"
      >
        <div class="d-flex flex-no-wrap justify-space-between">


            <v-img src="../assets/scanner.png" contain max-width="500" class="mr-3"></v-img>

          <div>
              <h3 class="font-weight-light mt-2 mb-4"><v-icon>mdi-circle-small</v-icon> A single MRI exam can contain dozens of separate scans</h3>
              <h3 class="font-weight-light mb-5"><v-icon>mdi-circle-small</v-icon> Each scan can contain hundreds or even dozens of individual images</h3>
              <h3 class="font-weight-light"><v-icon>mdi-circle-small</v-icon> Each image in each scan includes dozens of key-value metadata pairs that need to be verified</h3>
          </div>

        </div>
      </v-card>

<!--      <v-col cols="6">-->
<!--        <v-img src="../assets/scanner.png" class="elevation-4"></v-img>-->
<!--      </v-col>-->
<!--      <v-col cols="6">-->
<!--        <h3 class="font-weight-light mt-2 mb-4"><v-icon>mdi-circle-small</v-icon> A single MRI exam can contain dozens of separate scans</h3>-->
<!--        <h3 class="font-weight-light mb-5"><v-icon>mdi-circle-small</v-icon> Each scan can contain hundreds or even dozens of individual images</h3>-->
<!--        <h3 class="font-weight-light"><v-icon>mdi-circle-small</v-icon> Each image in each scan includes dozens of key-value metadata pairs that need to be verified</h3>-->
<!--      </v-col>-->
    </v-row>
    <v-alert text dark class="text--white" color="blue-grey" prominent icon="mdi-alert-circle-outline">
      A single exam of a single subject can generate potentially <b>hundreds of thousands of images</b> and <b>million of lines of metadata</b>.  A typical research lab can do <b>thousands of exams each year.</b>
    </v-alert>
<!--    <v-img src="../assets/sqan_infographic.png" />-->
  </v-container>
</template>

<script>
export default {
  name: "about",
};
</script>
