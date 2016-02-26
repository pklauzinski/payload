module.exports = function(grunt) {

    'use strict';

    grunt.initConfig({

        pkg: grunt.file.readJSON('package.json'),

        /**
         * https://github.com/gruntjs/grunt-contrib-jshint
         */
        jshint: {
            options: {
                curly: true,
                eqeqeq: true,
                eqnull: true,
                browser: true,
                forin: true,
                unused: 'vars',
                strict: true,
                trailing: true,
                latedef: true,
                globals: {
                    jQuery: true
                }
            },
            files: {
                src: ['Gruntfile.js', 'payload.js']
            }
        },

        /**
         * https://github.com/jscs-dev/grunt-jscs
         */
        jscs: {
            src: ['Gruntfile.js', 'payload.js'],
            options: {
                config: '.jscsrc'
            }
        },

        /**
         * https://github.com/gruntjs/grunt-contrib-uglify
         */
        uglify: {
            options: {
                preserveComments: 'some'
            },
            payload: {
                files: {
                    'payload.min.js': [
                        'payload.js'
                    ]
                }
            }
        }

    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-jscs');
    grunt.loadNpmTasks('grunt-contrib-uglify');

    grunt.registerTask('default', ['jshint', 'jscs', 'uglify']);
    grunt.registerTask('test', ['jshint', 'jscs']);
};