<template>
  <span
    style="cursor: pointer" class="color-box" :class="status"
  ></span>
</template>

<script>

  export default {
    name: 'SeriesBox',
    props: {
      series: Object
    },
    computed: {
      status: function() {
        if(this.series.qc1_state === undefined) return 'na';
        if(this.series.qc1_state === 'autopass') return 'pass';
        if(this.series.qc1_state === 'fail') return 'fail';
        if(this.series.qc1_state === 'accept') return 'warning';
        return 'na';
      }
    }
  }
</script>

<style>
  .color-box {
    width: 25px;
    height: 25px;
    display: inline-block;
    background-color: rgb(144, 155, 143);
    border: 1px solid #000;
    margin: 0;
  }

  .pass {
    background-color: rgba(0, 139, 86, 0.7);
  }

  .warning {
    background-color: rgb(189, 176, 51, 0.7);
  }

  .fail {
    background-color: rgb(201, 0, 17, 0.7);
  }

  .na {
    background-color: rgba(148, 148, 148, 0.2);
  }
</style>
