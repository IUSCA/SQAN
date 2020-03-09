<template>
  <div class="row">
    <div class="input-group">
      <span class="input-group-addon">
        <font-awesome-icon
          icon="filter"
          aria-hidden="true"
          style="vertical-align:middle"
        />
      </span>
      <input
        type="text"
        class="form-control pull-right input-sm"
        v-model="filter"
        v-on:input="updateFilter"
        placeholder="filter..."
      />
    </div>
  </div>
</template>

<script>
// use with @/plugins/filters.js mixin in parent component
export default {
  data() {
    return {
      filter: ""
    };
  },
  methods: {
    updateFilter() {
      // TODO:
      // this.$helpers.debounce doesn't seem to have any effect:
      // this.$helpers.debounce(this.$emit("update-filter", this.filter), 2000);

      this.$emit("update-filter", this.filter);
    }
  }
};
</script>

<style scoped>
.input-group-addon {
  padding: 2px;
  background-color: #eeeeee;
  border: 1px solid #cccccc;
  color: #6f6f6f;
  font-size: 15px;
  display: flex;
  align-items: center;
}
.form-control {
  padding: 5px;
  height: inherit;
  font-size: inherit;
}
</style>
