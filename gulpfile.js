var gulp      = require('gulp'),
    //  gulp plugins
    mocha     = require('gulp-mocha'),
    //  variables
    path      = {};

path.tests = 'test/*.js';
path.js    = ['./index.js', 'lib/*.js']


gulp.task('unit-test', function(){

  return gulp.src(path.tests)
  .pipe(mocha({ reporter: 'spec'}));
});

gulp.task('watch', function(){

  gulp.watch([
    path.tests,
    path.js
  ],
  ['unit-test']);
});