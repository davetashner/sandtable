// CloudFront Function — viewer-request on the /assets/* behaviour of both
// distributions. Runtime cloudfront-js-2.0.
//
// CloudFront forwards the full request path to the origin, but the assets
// bucket stores objects without the prefix (tiles/…, geo/…, media/…):
//   /assets/tiles/western-europe-z10.pmtiles → s3://assets/tiles/western-europe-z10.pmtiles
//   /assets/geo/borders/1914.geojson          → s3://assets/geo/borders/1914.geojson
function handler(event) {
  var request = event.request;
  if (request.uri.indexOf('/assets/') === 0) {
    request.uri = request.uri.substring('/assets'.length);
  }
  return request;
}
