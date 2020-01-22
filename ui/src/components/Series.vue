<template>
    <div class="series" v-if="series.series !== undefined">
        <slot name="close"></slot>
        <h4>{{series.series.series_desc}}</h4>

        <b-list-group>
            <b-list-group-item variant="info">
                <b-row>
                    <b-col cols="2">
                        <h5>Subject</h5>
                    </b-col>
                    <b-col cols="10">
                        <h4>
                            {{series.series.exam_id.subject}}
                        </h4>
                    </b-col>
                </b-row>
            </b-list-group-item>
            <b-list-group-item>
                <b-row>
                    <b-col cols="2">
                        <b>Series Description</b>
                    </b-col>
                    <b-col cols="10">
                        <b>{{series.series.series_desc}}</b>
                    </b-col>
                </b-row>
            </b-list-group-item>
            <b-list-group-item>
                <b-row>
                    <b-col cols="2">
                        Study Timestamp
                    </b-col>
                    <b-col cols="10">
                        {{series.series.exam_id.StudyTimestamp}}
                    </b-col>
                </b-row>
            </b-list-group-item>
        </b-list-group>
        <div
                v-for="img in series.images"
                class="block"
                :key="img._id"
                :class="{ error: img.qc.errors.length, warning: img.qc.warnings.length, success: !(img.qc.errors.length + img.qc.warnings.length) }"
                @click="selectImage(img._id)"
        ></div>

        <image-header :img="selected_img" v-if="selected_img"></image-header>
    </div>
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

                this.$http.get(`/api/qc/series/id/${this.series_id}`)
                    .then(res => {
                        this.series = Object.assign({}, res.data);
                        console.log(res.data);
                    }, err=> {
                        console.log(err);
                    });

            },
            selectImage(img_id) {
                let self = this;

                this.$http.get(`/api/qc/image/${img_id}`)
                    .then(res => {
                        console.log(res.data);
                        self.selected_img = res.data;
                    }, err => {
                        console.log(err);
                    })
            },
            monitorSeries() {
                let es = new EventSource(`/api/qc/series/livefeed/`);

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

    .block {
        min-width: 15px;
        min-height: 15px;
        margin: 2px;
        border: 1px solid black;
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

</style>
