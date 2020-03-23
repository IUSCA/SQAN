<template>
  <v-card class="series mt-5" v-if="series.series !== undefined">
    <slot name="close"></slot>

    <v-simple-table>
      <tbody>
      <tr>
        <th>
          Series
        </th>
        <td>
          {{series.series.series_desc}}
        </td>
      </tr>
      <tr>
        <th>
          Date
        </th>
        <td>
          {{series.series.exam_id.StudyTimestamp}}
        </td>
      </tr>
      <tr>
        <th valign="top">
          Images
        </th>
        <td>
          <div class="image_blocks mt-2 mr-2 mb-2">
            <div
              v-for="img in series.images"
              class="block"
              :key="img._id"
              :class="{
                error: img.qc.errors.length,
                warning: img.qc.warnings.length,
                success: !(img.qc.errors.length + img.qc.warnings.length),
                selected: selected_img && selected_img._id == img._id
              }"
              @click="selectImage(img._id)"
            ></div>
          </div>

          <image-header :img="selected_img" v-if="selected_img"></image-header>
        </td>
      </tr>
      </tbody>
    </v-simple-table>
    <!--        <v-card-title>Series: {{series.series.series_desc}}</v-card-title>-->
    <!--        <v-card-subtitle>Date: {{series.series.exam_id.StudyTimestamp}}</v-card-subtitle>-->

    <!--      <div class="image_blocks ml-2 mr-2 mb-2">-->
    <!--        <div-->
    <!--                v-for="img in series.images"-->
    <!--                class="block"-->
    <!--                :key="img._id"-->
    <!--                :class="{ error: img.qc.errors.length, warning: img.qc.warnings.length, success: !(img.qc.errors.length + img.qc.warnings.length) }"-->
    <!--                @click="selectImage(img._id)"-->
    <!--        ></div>-->
    <!--      </div>-->

    <!--        <image-header :img="selected_img" v-if="selected_img"></image-header>-->
  </v-card>
</template>

<script>

  import ImageHeader from '@/components/ImageHeader.vue';

  export default {
    name: 'Series',
    components: {ImageHeader},
    props: {
      series_id: String
    },
    data() {
      return {
        series: {},
        message: '',
        selected_img: null
      }
    },
    methods: {
      getSeries() {

        this.$http.get(`${this.$config.api}/series/id/${this.series_id}`)
          .then(res => {
            this.series = Object.assign({}, res.data);
            console.log(res.data);
          }, err => {
            console.log(err);
          });

      },
      selectImage(img_id) {
        let self = this;

        this.$http.get(`${this.$config.api}/image/${img_id}`)
          .then(res => {
            console.log(res.data);
            self.selected_img = res.data;
          }, err => {
            console.log(err);
          })
      },
      monitorSeries() {
        let es = new EventSource(`${this.$config.api}/series/livefeed/`);

        // let self = this;

        es.addEventListener('message', event => {
          console.log(`Event received! ${event.data}`);
          self.message = JSON.parse(event.data);
        }, false);

        es.addEventListener('error', event => {
          if (event.readyState == EventSource.CLOSED) {
            console.log('Event was closed');
            console.log(EventSource);
          }
        }, false);
      },
    },
    mounted() {
      this.getSeries();
      this.monitorSeries();
    },
    watch: {
      series_id(newval) {
        console.log(newval);
        this.getSeries();
      }
    }

  }
</script>

<style scoped>

  .image_blocks {
    line-height: 14px;
  }

  .block {
    min-width: 12px;
    min-height: 12px;
    margin: 1px;
    border: 1px solid black !important;
    display: inline-block;
  }


  .success {
    background-color: green;
  }

  .error {
    background-color: red;
  }

  .warning {
    background-color: yellow;
  }

  .waiting {
    background-color: grey;
  }

  .block.selected {
    min-height: 6px;
  }

</style>
