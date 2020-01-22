import Vue from 'vue';


Vue.filter('s2hms', function(value) {
    let hours =  parseInt(Math.floor(value / 3600));
    let minutes = parseInt(Math.floor((value - (hours * 3600)) / 60));
    let seconds= parseInt((value - ((hours * 3600) + (minutes * 60))) % 60);

    let dHours = (hours > 9 ? hours : '0' + hours);
    let dMins = (minutes > 9 ? minutes : '0' + minutes);
    let dSecs = (seconds > 9 ? seconds : '0' + seconds);

    return dHours + ":" + dMins + ":" + dSecs;
});


// usage: {{ file.size | prettyBytes }}
Vue.filter('prettyBytes', function (num) {
    // adapted from: https://github.com/sindresorhus/pretty-bytes
    if (typeof num !== 'number' || isNaN(num)) {
        throw new TypeError('Expected a number');
    }

    var exponent;
    var unit;
    var neg = num < 0;
    var units = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    if (neg) {
        num = -num;
    }

    if (num < 1) {
        return (neg ? '-' : '') + num + ' B';
    }

    exponent = Math.min(Math.floor(Math.log(num) / Math.log(1024)), units.length - 1);
    num = (num / Math.pow(1024, exponent)).toFixed(2) * 1;
    unit = units[exponent];

    return (neg ? '-' : '') + num + ' ' + unit;
});

Vue.filter('prettyBytesForce', function (num, unit) {
    // adapted from: https://github.com/sindresorhus/pretty-bytes
    if (typeof num !== 'number' || isNaN(num)) {
        throw new TypeError('Expected a number');
    }

    var neg = num < 0;
    var units = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    var exponent = units.indexOf(unit);
    if(!exponent) {
        throw new TypeError('Invalid unit specified');
    }

    if (neg) {
        num = -num;
    }

    num = (num / Math.pow(1024, exponent)).toFixed(2) * 1;
    // unit = units[exponent];

    return (neg ? '-' : '') + num + ' ' + unit;
});

/**
 * Vue filter to round the decimal to the given place.
 * http://jsfiddle.net/bryan_k/3ova17y9/
 *
 * @param {String} value    The value string.
 * @param {Number} decimals The number of decimal places.
 */
Vue.filter('round', function(value, decimals) {
    if(!value) {
        value = 0;
    }

    if(!decimals) {
        decimals = 0;
    }

    value = Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
    return value;
});


Vue.prototype.$filters = Vue.options.filters
