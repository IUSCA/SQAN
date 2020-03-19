<template>

  <div class="mt-5">
    <div class="headline">Template Series</div>
    <v-data-table :items="series" :headers="tseriesHeaders" show-select>

    </v-data-table>
  </div>
<!--  <div class="container">-->
<!--    <table-->
<!--      class="table table-striped table-hover info"-->
<!--      width="100%"-->
<!--      cellspacing="0"-->
<!--    >-->
<!--      &lt;!&ndash; <tr style="background-color:#e2eef5"> &ndash;&gt;-->
<!--      <th-->
<!--        class="text-center"-->
<!--        v-for="header in tseriesTable"-->
<!--        v-bind:key="header"-->
<!--      >-->
<!--        {{ header }}-->
<!--      </th>-->
<!--      <th>-->
<!--        <font-awesome-icon icon="trash-alt" aria-hidden="true" />-->
<!--      </th>-->
<!--      <tr-->
<!--        style="background-color:#f2f7fa"-->
<!--        v-for="dd in orderedSeries"-->
<!--        v-bind:key="dd.SeriesNumber"-->
<!--      >-->
<!--        <td class="text-center">{{ dd.SeriesNumber }}</td>-->
<!--        <td-->
<!--          class="text-center"-->
<!--          style="word-wrap: break-all;cursor:pointer"-->
<!--          v-on:click="opentemplate(dd.template_id)"-->
<!--        >-->
<!--          {{ dd.series_desc }}-->
<!--        </td>-->
<!--        <td class="text-center">{{ dd.usedInQC }}</td>-->
<!--        <td class="text-center">{{ dd.imageCount }}</td>-->
<!--        <td><input type="checkbox" v-on:click="toggleThisSeries(dd)" /></td>-->
<!--      </tr>-->
<!--    </table>-->
<!--  </div>-->
</template>

<script>
export default {
  props: {
    series: Array
  },
  data() {
    return {
      tseriesHeaders: [
        {
          text: "Series Number",
          value: 'SeriesNumber'
        },
        {
          text: "Series Description",
          value: "series_desc"
        },
        {
          text: "Times used for QC",
          value: "usedInQC"
        },
        {
          text: "# Images",
          value: "imageCount"
        }
      ],
      selectedSeries: {}
    };
  },
  methods: {
    toggleThisSeries(series) {
      if (this.selectedSeries.hasOwnProperty(series.SeriesNumber)) {
        // console.log("removing series: ", series.SeriesNumber)
        delete this.selectedSeries[series.SeriesNumber];
      } else {
        // console.log("adding series: ", series.SeriesNumber)
        this.selectedSeries[series.SeriesNumber] = series;
      }
    },
    opentemplate(tid) {
      // console.log(tid);
      window.open("template/" + tid);
    }
  },
  computed: {
    orderedSeries: function() {
      //return this._.orderBy(this.series, "SeriesNumber");
      return this.series.concat().sort(this.$helpers.sortBy("SeriesNumber"));
    }
  },
  mounted() {
    // console.log("Component has been created!");
    // console.log("series", this.series);
  }
};
</script>

<style></style>
