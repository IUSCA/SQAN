<template>
    <v-card>
      <v-card-title>
        Image Header - #{{img.InstanceNumber}}

        <v-spacer></v-spacer>
          <v-text-field
            v-model="search"
            append-icon="mdi-magnify"
            label="Search"
            single-line
            hide-details
          ></v-text-field>
      </v-card-title>

      <v-data-table :items="img_header" :headers="header" :search="search" dense>
          <template v-slot:item.err_msg="{ item }">
              <span v-if="item.key in qc_mapped">
                  <v-chip class="red white--text"><v-icon>mdi-alert</v-icon> {{qc_mapped[item.key].msg}}</v-chip>
              </span>
          </template>
      </v-data-table>
    </v-card>

</template>

<script>
    export default {

        name: 'image-header',
        data() {
          return {
            header: [{
              value: 'key',
              text: 'Key'
            }, {
              value: 'value',
              text: 'Value'
            }, {
                value: 'err_msg',
                text: 'QC Error'
            }
            ],
            search: ''
          }
        },
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
            },
            qc_mapped: function() {
                let mapped = {};

                this.img.qc.errors.forEach(qe => {
                    if(!(qe.k in mapped)) {
                        mapped[qe.k] = qe
                    }
                });

                return mapped;
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
