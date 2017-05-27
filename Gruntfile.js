module.exports = function(grunt) {

    'use strict';

    grunt.initConfig({

        pkg: grunt.file.readJSON('package.json'),

        /**
         * https://github.com/gyandeeps/gruntify-eslint
         */
        eslint: {
            options: {
                configFile: '.eslintrc'
            },
            src: ['Gruntfile.js', 'payload.js']
        },

        /**
         * https://github.com/vojtajina/grunt-bump
         */
        bump: {
            options: {
                files: ['package.json'],
                updateConfigs: ['pkg'],
                commit: true,
                commitMessage: 'Release version %VERSION%',
                commitFiles: ['.'],
                createTag: true,
                tagName: 'v%VERSION%',
                tagMessage: 'Release version %VERSION%',
                push: true,
                pushTo: 'origin',
                gitDescribeOptions: '--tags --always --abbrev=1 --dirty=-d',
                globalReplace: false,
                prereleaseName: false,
                metadata: '',
                regExp: false
            }
        }

    });

    grunt.loadNpmTasks('gruntify-eslint');
    grunt.loadNpmTasks('grunt-bump');

    grunt.registerTask('default', ['eslint']);
    grunt.registerTask('test', ['eslint']);
};