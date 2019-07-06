'use strict';

module.exports = {
  pause(duration) {
    return new Promise(resolve =>
      setTimeout(resolve, duration)
    );
  },
  retry(retries, fn, delay = 500) {
    fn()
      .catch(error => (retries > 1
        ? module.exports.pause(delay)
          .then(() => module.exports.retry(retries - 1, fn, delay))
        : Promise.reject(error))
      );
  },
};
