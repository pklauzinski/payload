module.exports = function(grunt) {

    'use strict';

    grunt.initConfig({

        pkg: grunt.file.readJSON('package.json'),

        /**
         * https://github.com/gruntjs/grunt-contrib-jshint
         */
        jshint: {
            options: {
                jshintrc: true
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
                files: ['package.json', 'bower.json'],
                updateConfigs: ['pkg'],
                commit: true,
                commitMessage: 'Release version %VERSION%',
                commitFiles: ['.'],
                createTag: true,
                tagName: 'v%VERSION%',
                tagMessage: 'Release version %VERSION%',
                push: true,
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