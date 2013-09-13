module.exports = function (grunt) {
    grunt.initConfig({
        less: {
            development: {
                files: [{
                    expand: true,
                    cwd: 'assets/less',
                    src: ['main.less'],
                    dest: 'app/css',
                    ext: '.css',
                }]
            }
        },
        watch: {
            files: ['assets/less/**/*.less'],
            tasks: ['less']
        },
        connect: {
            server: {
                options: {
                    port: 3000,
                    hostname: '*',
                    base: 'app'
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-connect');

    grunt.registerTask('server', [
        'connect',
        'watch'
    ]);
};
