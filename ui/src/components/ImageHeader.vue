<template>
    <b-table :items="img_header">

    </b-table>
</template>

<script>
    export default {

        name: 'image-header',
        computed: {
            img_header: function() {
                let self = this;
                if(this.img.primary_image !== null) {
                    return Object.keys(this.img.primary_image.headers).map(k => {
                        let val = this.img.primary_image.headers[k];
                        if(k in self.img.headers) {
                            val = self.img.headers[k];
                        }
                        let rObj = {
                            key: k,
                            value: val
                        };
                        return rObj
                    })

                } else {
                    return Object.keys(this.img.headers).map(k => {
                        let rObj = {
                            key: k,
                            value: this.img.headers[k]
                        };
                        return rObj
                    })
                }
            }
        },
        props: {
            img: Object,
            errOnly: Boolean,
            filterOn: String
        }
    }
</script>

<style>

</style>
