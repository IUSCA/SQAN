<template>
    <div class="subject-label clickable">
        <small>{{subject.subject}}</small>

        <div class="progress exam-state">
            <b-progress :max="subject.qc.all_series + subject.qc.series_missing.length" height="2px">
                <b-progress-bar :value="subject.qc.series_passed" variant="success"></b-progress-bar>
                <b-progress-bar :value="subject.qc.series_failed" variant="warning"></b-progress-bar>
                <b-progress-bar :value="subject.qc.series_passed_warning" variant="danger"></b-progress-bar>
                <b-progress-bar :value="subject.qc.series_missing.length" variant="info"></b-progress-bar>
                <b-progress-bar :value="subject.qc.series_no_template.length" variant="default"></b-progress-bar>
            </b-progress>
        </div>
    </div>
</template>

<script>

    export default {
        name: 'SubjectBlock',
        props: {
            subject: Object
        },

    }
</script>

<style scoped>

    .progress.exam-state {
        display: inline-block;
        border: none;
        margin: 0px;
        padding: 0px;
        height: 18px;
        width: 110px;
    }

    .subject-label {
        line-height: 18px;
        display: inline-block;
        margin-right: 5px;
    }

    .subject-label small {
        line-height: 175%;
        margin-left: 3px;
        color: #000000;
        font-size: 9px;
        position: absolute;
    }

    .subject-label:hover {
        box-shadow: 0px 0px 5px #666;
    }

</style>
