// lab-creator/src/setupProxy.js

//delete this if you are no longer using iframe
module.exports = function(app) {
  app.use((req, res, next) => {
    // Allow embedding in iframe (development only)
    res.setHeader("X-Frame-Options", "ALLOWALL");
    res.setHeader("Content-Security-Policy", "frame-ancestors *");
    next();
  });
};
