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
          <v-checkbox
                  v-model="errOnly"
                  label="Show only warnings/errors"
          ></v-checkbox>
      </v-card-title>

      <v-data-table :items="filtered_headers" :headers="header" :search="search" dense>
          <template v-slot:item.err_msg="{ item }">
              <span v-if="item.key in qc_errors">
                  <v-chip class="red white--text" small><v-icon>mdi-alert</v-icon> {{qc_errors[item.key].msg}} | Template value: <b>{{qc_errors[item.key].tv}}</b></v-chip>
              </span>
              <span v-if="item.key in qc_warnings">
                  <v-chip class="orange white--text" small><v-icon>mdi-alert</v-icon> {{qc_warnings[item.key].msg}} | Template value: <b>{{qc_warnings[item.key].tv}}</b></v-chip>
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
            errOnly: true,
            header: [{
              value: 'key',
              text: 'Key'
            }, {
              value: 'value',
              text: 'Value'
            }, {
                value: 'err_msg',
                text: 'QC Messages'
            }
            ],
            search: ''
          }
        },
        computed: {
            filtered_headers: function() {
              if(!this.errOnly) return this.img_header;

              return this.img_header.filter( h => {
                return (h.key in this.qc_errors || h.key in this.qc_warnings);
              })
            },
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
            qc_errors: function() {
                let mapped = {};

                this.img.qc.errors.forEach(qe => {
                    if(!(qe.k in mapped)) {
                        mapped[qe.k] = qe
                    }
                });

                return mapped;
            },
              qc_warnings: function() {
                let mapped = {};

                this.img.qc.warnings.forEach(qe => {
                  if(!(qe.k in mapped)) {
                    mapped[qe.k] = qe
                  }
                });

                return mapped;
              }
        },
        props: {
            img: Object,
            filterOn: String
        }
    }
</script>

<style>

</style>
