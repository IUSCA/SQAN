var fs = require('fs');
var cleaner = require('../clean');
var assert = require('chai').assert;

//samples picked from /N/gs/dicom/headers


//create *correct* answers - make sure you are bug free before you run this!
var samples = [
    "pt/1.3.12.2.1107.5.1.4.11035.30000015052018300345200000178",
    "pt/1.3.12.2.1107.5.1.4.11035.30000015052018300345200000520",
    "ct/1.3.12.2.1107.5.1.4.11035.30000015052018283765500000014",
    "ct/1.3.12.2.1107.5.1.4.11035.30000015052018283765500000033",
    "mr/1.3.12.2.1107.5.2.19.45285.201505190831116864758341",
    "mr/1.3.12.2.1107.5.2.19.45294.2013092508530029841671435"
].forEach(function(id) {
    var input = JSON.parse(fs.readFileSync('test/samples/'+id+'.json', {encoding: 'utf8'}));
    cleaner.clean(input);
    fs.writeFileSync('test/output/'+id+'.json', JSON.stringify(input, null, 4));
});


describe('clean', function() {
    it('pt', function () {
        var input = JSON.parse(fs.readFileSync('test/samples/pt/1.3.12.2.1107.5.1.4.11035.30000015052018300345200000520.json', {encoding: 'utf8'}));
        cleaner.clean(input);
        //console.log(JSON.stringify(input, null, 4));
        var expected = JSON.parse(fs.readFileSync('test/output/pt/1.3.12.2.1107.5.1.4.11035.30000015052018300345200000520.json', {encoding: 'utf8'}));
        //console.log(JSON.stringify(correct, null, 4));
        //correct.test = "helo";
        assert.deepEqual(input, expected); 
    });
    it('ct', function () {
        var input = JSON.parse(fs.readFileSync('test/samples/ct/1.3.12.2.1107.5.1.4.11035.30000015052018283765500000014.json', {encoding: 'utf8'}));
        cleaner.clean(input);
        var expected = JSON.parse(fs.readFileSync('test/output/ct/1.3.12.2.1107.5.1.4.11035.30000015052018283765500000014.json', {encoding: 'utf8'}));
        assert.deepEqual(input, expected); 
    });
    it('mr', function () {
        var input = JSON.parse(fs.readFileSync('test/samples/mr/1.3.12.2.1107.5.2.19.45285.201505190831116864758341.json', {encoding: 'utf8'}));
        cleaner.clean(input);
        //console.dir(input);
        var expected = JSON.parse(fs.readFileSync('test/output/mr/1.3.12.2.1107.5.2.19.45285.201505190831116864758341.json', {encoding: 'utf8'}));
        //assert.deepEqual(input, expected); 
        assert.deepEqual(input, expected); 
    });
});
