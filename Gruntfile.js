module.exports = function (grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    jsdoc : {
      dist : {
        src: ['src/**/*.js', 'INDEX.md'],
        options: {
          destination: 'doc'
        }
      }
    }

  });

  grunt.loadNpmTasks('grunt-jsdoc');
};