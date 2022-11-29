const run = require('gulp-run-command').default;
const { watch } = require('gulp');

function rustBuild(cb) {
  run('make build-rust');

  cb();
}

exports.default = () => {
  watch(['./wasm/**/*.rs'], rustBuild);
}
