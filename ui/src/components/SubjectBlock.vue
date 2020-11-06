<template>

    <v-chip
      :color="status.bg"
      :text-color="status.text"
      :class="`mb-1 font-weight-light elevation-${elevation}`"
      small
      link
    >
      <v-icon small class="pr-2">{{status.icon}}</v-icon>
      {{subject.StudyTimestamp | moment("YYYY-MM-DD")}}

    </v-chip>

<!--    <div class="subject-label clickable">-->
<!--        <small>{{subject.subject}}</small>-->

<!--        <div class="progress exam-state">-->
<!--            <b-progress :max="subject.qc.all_series + subject.qc.series_missing.length" height="2px">-->
<!--                <b-progress-bar :value="subject.qc.series_passed" variant="success"></b-progress-bar>-->
<!--                <b-progress-bar :value="subject.qc.series_failed" variant="warning"></b-progress-bar>-->
<!--                <b-progress-bar :value="subject.qc.series_passed_warning" variant="danger"></b-progress-bar>-->
<!--                <b-progress-bar :value="subject.qc.series_missing.length" variant="info"></b-progress-bar>-->
<!--                <b-progress-bar :value="subject.qc.series_no_template.length" variant="default"></b-progress-bar>-->
<!--            </b-progress>-->
<!--        </div>-->
<!--    </div>-->
</template>

<script>

    export default {
        name: 'SubjectBlock',
        props: {
            subject: Object,
            selected: String
        },
        data() {
          return {
            statuses: {
              'danger': {
                bg: 'red darken-3',
                text: 'white',
                icon: 'mdi-alert-circle'
              },
              'warning': {
                bg: 'orange',
                text: 'black',
                icon: 'mdi-alert-outline'
              },
              'missing': {
                bg: 'light-blue',
                text: 'black',
                icon: 'mdi-flask-empty-outline'
              },
              'notemplate': {
                bg: 'grey',
                text: 'black',
                icon: 'mdi-border-none-variant'
              },
              'success': {
                bg: 'light-green',
                text: 'black',
                icon: 'mdi-check-circle'
              }
            }
          }
        },
        computed: {
            status: function() {
              if(this.subject.qc.series_failed) return this.statuses['danger'];
              if(this.subject.qc.series_passed_warning) return this.statuses['warning'];
              if(this.subject.qc.series_missing.length) return this.statuses['missing'];
              if(this.subject.qc.series_no_template.length) return this.statuses['notemplate'];
              return this.statuses['success'];
            },
            elevation: function() {
              return this.selected == this.subject._id ? '0' : '5';
            },


        }

    }
</script>

<style scoped>

    /*.progress.exam-state {*/
    /*    display: inline-block;*/
    /*    border: none;*/
    /*    margin: 0px;*/
    /*    padding: 0px;*/
    /*    height: 18px;*/
    /*    width: 110px;*/
    /*}*/

    /*.subject-label {*/
    /*    line-height: 18px;*/
    /*    display: inline-block;*/
    /*    margin-right: 5px;*/
    /*}*/

    /*.subject-label small {*/
    /*    line-height: 175%;*/
    /*    margin-left: 3px;*/
    /*    color: #000000;*/
    /*    font-size: 9px;*/
    /*    position: absolute;*/
    /*}*/

    /*.subject-label:hover {*/
    /*    box-shadow: 0px 0px 5px #666;*/
    /*}*/

</style>
