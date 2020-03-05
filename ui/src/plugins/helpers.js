export default {

  // https://github.com/you-dont-need/You-Dont-Need-Lodash-Underscore#_sortby-and-_orderby

  // use with:
  // fruits.concat().sort(sortBy("name"));

  sortBy: key => {
    return (a, b) => (a[key] > b[key] ? 1 : b[key] > a[key] ? -1 : 0);
  },
}