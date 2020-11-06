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
          <v-btn rounded small color="blue-grey" @click="toggleShowing" class="ma-2 white--text">
              Showing:
              <span v-if="showing == 'errors'">
                  errors/warnings
              </span>
              <span v-if="showing == 'qc'">
                  QC items
              </span>
              <span v-if="showing == 'all'">
                  all
              </span>
          </v-btn>
<!--          <v-checkbox-->
<!--                  v-model="errOnly"-->
<!--                  label="Show only warnings/errors"-->
<!--          ></v-checkbox>-->
      </v-card-title>

      <v-data-table
              :items="filtered_headers"
              :headers="header"
              :search="search"
              :items-per-page="30"
              dense
      >

          <template v-slot:item.qc="{ item }">
              <span v-if="qc_keys !== undefined && qc_keys.includes(item.key)">
                  <v-icon small color="info">mdi-checkbox-multiple-marked-circle</v-icon>
              </span>
          </template>

          <template v-slot:item.value="{ item }">
              <span v-if="Array.isArray(item.value)">
                  <div v-for="(vx, idx) in item.value" :key="idx">
                      {{vx}}
                  </div>
              </span>

              <div v-if="!Array.isArray(item.value)">
                  {{item.value}}
              </div>
          </template>

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
            showing: 'errors',
            header: [{
              value: 'qc',
              text: 'QC'
            }, {
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
        methods: {
          toggleShowing() {
            if(this.showing === 'errors') {
              if(this.qc_keys !== undefined) {
                this.showing = 'qc';
              } else {
                this.showing = 'all';
              }
              return;
            }
            if(this.showing === 'qc') {
              this.showing = 'all';
              return;
            }
            if(this.showing === 'all') {
              this.showing = 'errors';
              return;
            }
          }
        },
        computed: {
            filtered_headers: function() {
              let keys = [];
              this.img.qc.errors.forEach(qe => {
                if(qe.type === 'not_set') {
                  keys.push({
                    key: qe.k,
                    value: ''
                  })
                }
              });

              // always show missing keys

              if(this.showing === 'all') return keys.concat(this.img_header);

              if(this.showing === 'errors') {
                let err_only = this.img_header.filter( h => {
                  return (h.key in this.qc_errors || h.key in this.qc_warnings);
                })
                return keys.concat(err_only);
              }

              let qcd = this.img_header.filter( h => {
                return this.qc_keys.includes(h.key)
              })

              return keys.concat(qcd);

            },
            img_header: function() {
                let self = this;

                if(this.img.primary_image !== null) {
                    let p_keys = [];
                    let hdr = Object.keys(this.img.primary_image.headers).map(k => {

                        p_keys.push(k);
                        let val = this.img.primary_image.headers[k];
                        if(k in self.img.headers) {
                            val = self.img.headers[k];
                        }
                        let rObj = {
                            key: k,
                            value: val
                        };
                        return rObj
                    });

                    Object.keys(this.img.headers).map(k => {
                      if(!p_keys.includes(k)) {
                        hdr.push({
                          key: k,
                          value: self.img.headers[k]
                        })
                      }
                    });

                    return hdr;

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
            qc_keys: Array,
            filterOn: String
        }
    }
</script>

<style>

</style>
