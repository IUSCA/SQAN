<template>
  <div class="row">
    <div class="input-group">
      <span class="input-group-addon">
        <font-awesome-icon icon="filter" aria-hidden="true" style="vertical-align:middle" />
      </span>
      <input
        type="text"
        class="form-control pull-right input-sm"
        v-bind:value="filter"
        placeholder="filter..."
      />
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      filter: ""
    };
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
