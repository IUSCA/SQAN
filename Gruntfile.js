
module.exports = function(grunt) {
    grunt.initConfig({
        less: {
            development: {
                options: {
                    paths: ["./ui/css"],
                    yuicompress: true
                },
                files: {
                    "./ui/css/style.css": "./ui/css/style.less"
                }
            }
        },
        watch: {
            files: "./ui/css/*.less",
            tasks: ["less"]
        }
    });

    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.registerTask('default', ['less']);
};
