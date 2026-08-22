// CloudFront Function — viewer-request on the production distribution.
// Runtime cloudfront-js-2.0 (no modules, no async, ~10 KB max).
//
// Single-page-app routing: a path whose last segment has no file extension
// (/, /1914, /1914/marne) is served index.html; everything that looks like a
// file (/app/index-abc123.js, /assets/tiles/europe.pmtiles) passes through.
function handler(event) {
  var request = event.request;
  var uri = request.uri;
  var last = uri.substring(uri.lastIndexOf('/') + 1);
  if (uri.endsWith('/') || last.indexOf('.') === -1) {
    request.uri = '/index.html';
  }
  return request;
}
