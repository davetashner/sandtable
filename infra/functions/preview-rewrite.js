// CloudFront Function — viewer-request on the PR-preview distribution.
// Runtime cloudfront-js-2.0 (no modules, no async, ~10 KB max).
//
// The distribution answers for *.sandtable.davetashner.com. The first label of
// the Host header selects a prefix in the preview bucket:
//   pr-12.sandtable.davetashner.com/1914/marne  →  s3://preview/pr-12/index.html
//   pr-12.sandtable.davetashner.com/app/x.js    →  s3://preview/pr-12/app/x.js
// Hosts that are not pr-<n> get a plain 404 rather than leaking bucket contents.
function handler(event) {
  var request = event.request;
  var host = request.headers.host ? request.headers.host.value : '';
  var label = host.split('.')[0];
  if (!/^pr-[0-9]+$/.test(label)) {
    return {
      statusCode: 404,
      statusDescription: 'Not Found',
      headers: { 'content-type': { value: 'text/plain; charset=utf-8' } },
      body: 'No preview is deployed at this host.\n',
    };
  }
  var uri = request.uri;
  var last = uri.substring(uri.lastIndexOf('/') + 1);
  if (uri.endsWith('/') || last.indexOf('.') === -1) {
    uri = '/index.html';
  }
  request.uri = '/' + label + uri;
  return request;
}
