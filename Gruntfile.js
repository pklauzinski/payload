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
         * https://github.com/vojtajina/grunt-bump
         */
        bump: {
            options: {
                files: ['package.json', 'bower.json', 'payload.js'],
                updateConfigs: ['pkg'],
                commit: true,
                commitMessage: 'Release v%VERSION%',
                commitFiles: ['package.json'],
                createTag: true,
                tagName: 'v%VERSION%',
                tagMessage: 'Version %VERSION%',
                push: 'tag',
                pushTo: 'upstream',
                gitDescribeOptions: '--tags --always --abbrev=1 --dirty=-d',
                globalReplace: false,
                prereleaseName: false,
                metadata: '',
                regExp: false
            }
        }

    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-jscs');
    grunt.loadNpmTasks('grunt-bump');

    grunt.registerTask('default', ['jshint', 'jscs']);
    grunt.registerTask('test', ['jshint', 'jscs']);
};