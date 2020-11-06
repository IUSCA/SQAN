// mixin for filtering on components

export default {
  data() {
    return {
      results: [],
      search: ""
    };
  },
  computed: {
    filteredResults: function() {
      let filtered = this.results;
      if (this.search) {
        let first = this.results[0];
        var keys = Object.keys(first);
        filtered = this.results.filter(item => {
          let match = false;
          let i = 0;
          // look at all of the keys until we find a match
          while (i < keys.length && !match) {
            let field = item[keys[i]];
            // ignoring other types for search
            if (["number", "string"].indexOf(typeof field) > -1) {
              if (typeof field === "number") {
                field = field.toString();
              }
              if (field.toLowerCase().indexOf(this.search) > -1) {
                match = true;
                // console.log("matched: ", this.search, " in ", field);
              }
            }
            i++;
          }
          return match;
        });
      }
      return filtered;
    }
  }
};
