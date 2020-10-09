<template>
  <v-card class="series pa-4" v-if="series.series !== undefined">

    <div class="display-1 font-weight-medium" v-if="exam">
      <v-icon large>mdi-account-check</v-icon>
      {{exam.subject}}
    </div>

    <div class="subtitle-1" v-if="exam">
      <v-icon>mdi-flask</v-icon>
      {{exam.research_id.IIBISID}} // {{exam.research_id.Modality}} // {{exam.research_id.StationName}}<br>
      <v-icon>mdi-clock</v-icon>
      {{exam.StudyTimestamp | moment("MMM Do, YYYY hh:mm:ss")}}
    </div>


    <Clipboard :message="direct_link"></Clipboard>
    <FrameReport :series_id="series.series._id" v-if="series.series.series_desc.includes('dyna')"></FrameReport>
    <ReQC :series="series.series" :exam="series.series.exam_id"></ReQC>
    <Contact :exam="series.series.exam_id" :series="series.series"></Contact>
    <Comment :series_id="series.series._id" v-on:submitted="getSeries"></Comment>

    <v-divider vertical class="mx-2"></v-divider>

    <span class="caption mr-2 mb-2">QC Override:</span>

    <Confirm
      v-if="$store.getters.hasRole('admin')"
      title="QC Override (approve)"
      message="Are you sure you want to approve (pass) this series for QC purposes?"
      v-on:confirm="updateQCState('accept')"
    >
      <template v-slot:label>
        <v-btn x-small color="green lighten-2">Pass</v-btn>
      </template>
    </Confirm>

    <Confirm
      v-if="$store.getters.hasRole('admin')"
      title="QC Override (reject)"
      message="Are you sure you want to reject (fail) this series for QC purposes?"
      v-on:confirm="updateQCState('reject')"
    >
      <template v-slot:label>
        <v-btn x-small color="red lighten-2">Fail</v-btn>
      </template>
    </Confirm>

    <v-divider class="my-2"></v-divider>

    <v-tabs v-model="tab">
      <v-tab>Summary</v-tab>
      <v-tab>
        Images
        <v-chip class="ml-1" color="green" text-color="white">
            {{series.images.length}}
        </v-chip>
      </v-tab>
      <v-tab>
        Events
        <v-chip class="ml-1" color="blue" text-color="white">
          {{filtered_events.length}}
        </v-chip>
      </v-tab>
      <v-tabs-items v-model="tab">
        <v-tab-item>
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
                {{series.series.exam_id.StudyTimestamp | moment("MMM Do YYYY, h:mm:ssA")}}
              </td>
            </tr>
            <tr>
              <th>
                Template Used
              </th>
              <td>
                <TemplateBadge :id="series.series.qc.template_id" v-if="series.series.qc !== undefined"></TemplateBadge>
              </td>
            </tr>
            <tr>
              <th>
                Comments
              </th>
              <td>
                <div v-for="comment in series.series.comments" :key="comment.date">
                  <span class="font-italic font-weight-light">{{comment.comment}} - {{comment.date | moment("MMM Do YYYY")}}</span> <Avatar :user_id="comment.user_id"></Avatar>
                </div>
              </td>
            </tr>
            <tr>
              <th>
                QC State
              </th>
              <td>
                <SeriesStatus :series="series.series"></SeriesStatus>
              </td>
            </tr>
            <tr v-if="series.series.qc !== undefined">
              <th>
                QC Issues
              </th>
              <td>
                <ErrorPanel v-for="error in series.series.qc.errors" :key="error.type" :error="error" type="error" :notemps="series.series.qc.notemps"></ErrorPanel>
                <ErrorPanel v-for="warning in series.series.qc.warnings" :key="warning.type" :error="warning" type="warning"></ErrorPanel>
                <ErrorPanel v-if="series.series.qc.notemps > 0" :notemps="series.series.qc.notemps" type="info"></ErrorPanel>
              </td>
            </tr>

            </tbody>
          </v-simple-table>
        </v-tab-item>
        <v-tab-item>
          <div class="image_blocks mt-2 mr-2 mb-2">
            <div
              v-for="img in series.images"
              class="block"
              :key="img._id"
              :class="{
                waiting: img.qc === undefined,
                error: img.qc !== undefined && img.qc.errors.length,
                warning: img.qc !== undefined && img.qc.warnings.length,
                success: img.qc !== undefined && !(img.qc.errors.length + img.qc.warnings.length),
                selected: selected_img && selected_img._id == img._id
              }"
              @click="selectImage(img._id)"
            ></div>
          </div>

          <image-header :img="selected_img" v-if="selected_img"></image-header>
        </v-tab-item>
        <v-tab-item>
          <v-timeline>

            <v-timeline-item v-for="(evt, idx) in filtered_events" :key="idx" :icon="evt.icon">
              <v-card class="elevation-2">
                <v-card-title>{{evt.title}}</v-card-title>
                <v-card-text>
                  {{evt.date | moment("MMM Do YYYY, h:mm:ssA")}}
                  <span v-if="evt.user_id !== undefined"><Avatar :user_id="evt.user_id"></Avatar></span>
                </v-card-text>
              </v-card>
            </v-timeline-item>
          </v-timeline>
        </v-tab-item>
      </v-tabs-items>
    </v-tabs>

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
  import ErrorPanel from "./series/ErrorPanel";
  import Contact from "./Contact";
  import ReQC from "./exams/ReQC";
  import SeriesStatus from "./exams/SeriesStatus";
  import TemplateBadge from "./templates/TemplateBadge";
  import Confirm from "./Confirm";
  import Comment from "./Comment";
  import Avatar from "./Avatar";
  import FrameReport from "./series/FrameReport";
  import Clipboard from "./Clipboard";

  export default {
    name: 'Series',
    components: {ImageHeader, ErrorPanel, Contact, SeriesStatus, Confirm, Comment, Avatar, TemplateBadge, ReQC, FrameReport, Clipboard},
    props: {
      series_id: String
    },
    data() {
      return {
        series: {},
        message: '',
        selected_img: null,
        tab: null
      }
    },
    computed: {
      direct_link() {
        return `${window.location.origin}/exams?series=${this.series_id}`;
      },
      exam() {
        return this.series.series !== undefined ? this.series.series.exam_id : undefined;
      },
      filtered_events() {
        let evts = [
          {title: 'Received by SCA', date: this.series.series.createdAt, icon: 'mdi-send-check'},
          {title: 'Study Performed', date: this.series.series.exam_id.StudyTimestamp, icon: 'mdi-magnify-scan'},
          ];

        if(this.series.series.qc !== undefined) {
          evts.unshift({title: 'QC1 Performed', date: this.series.series.qc.date, icon: 'mdi-check-circle-outline'});
        }

        this.series.series.events.forEach(evt => {
          if(evt.title === 'Received') return;
          evts.unshift({title: evt.title, date: evt.date, icon: 'mdi-calendar', user_id: evt.user_id});
        });

        return evts;
      }
    },
    methods: {
      getSeries() {

        this.$http.get(`${this.$config.api}/series/id/${this.series_id}`)
          .then(res => {
            this.series = Object.assign({}, res.data);
            console.log(res.data);
            this.selectImage(res.data.images[0]._id);
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
      updateQCState(state) {
        let data = {
          comment: 'Manual QC approval/rejection',
          level: 1,
          state: state
        };

        let self = this;
        this.$http.post(`${this.$config.api}/series/qcstate/${this.series_id}`, data)
          .then(res => {
            console.log(res.data);
            self.series = {};
            self.getSeries()
          }, err => {
            console.log(err);
          });
      },
    },
    mounted() {
      this.getSeries();
      // this.monitorSeries();
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
