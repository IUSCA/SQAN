<template>
  <span>
    <span v-if="pi !== undefined">
      {{pi.pi_last_name}}, {{pi.pi_first_name}} <a :href="'mailto:' + pi.email_address" class="subtitle-1 font-weight-light" v-if="show_email">{{pi.email_address}}</a>
    </span>
  </span>
</template>

<script>

  export default {
    name: 'PrimaryInvestigator',
    props: {
      research_id: String,
      show_email: {
        type: Boolean,
        default: false
      }
    },
    data() {
      return {
        pi: {}
      }
    },
    methods: {
      getDetail: function() {
        let url = `${this.$config.api}/iibis/${this.research_id}`;
        let self = this;
        this.$http.get(url)
          .then(function(res) {
            self.pi = res.data[0];
          }, function(err) {
            console.log(err);
          });
      }
    },
    mounted() {
      this.$nextTick(function() {
        this.getDetail();
      });
    }
  }
</script>

<style>

</style>
