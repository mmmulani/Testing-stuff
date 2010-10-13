// vlad's amazing stuff from
// https://people.mozilla.com/~vladimir/demos/darkroom/darkroom.html

function FastLog2(x) {
  return Math.log(x) / Math.LN2;
}

var LOG2_HALF = FastLog2(0.5);

function FastBias(b, x) {
  return Math.pow(x, FastLog2(b) / LOG2_HALF);
}

function FastGain(g, x) {
  return (x < 0.5) ?
    FastBias(1.0 - g, 2.0 * x) * 0.5 :
    1.0 - FastBias(1.0 - g, 2.0 - 2.0 * x) * 0.5;
}

function Clamp(x) {
  return (x < 0.0) ? 0.0 : ((x > 1.0) ? 1.0 : x);
}

function ProcessImageData(imageData, params) {
  // XXX needs better way to setting default params
  var saturation = params.saturation || 1; // [0, 2]
  var contrast = params.contrast || 1; // [0, 2]
  var brightness = params.brightness || 1; // [0, 2]
  var blackPoint = params.blackPoint || 0; // [0, 1]
  var fill = params.fill || 0; // [0, 1]
  var temperature = params.temperature || 0; // [-2000, 2000]
  var shadowsHue = params.shadowsHue || .5; // [0, 1]
  var shadowsSaturation = params.shadowsSaturation || 0; // [0, 2]
  var highlightsHue = params.highlightsHue || .5; // [0, 1]
  var highlightsSaturation = params.highlightsSaturation || 0; // [0, 2]
  var splitPoint = params.splitPoint || 0; // [-1, 1]

  var brightness_a, brightness_b;
  var oo255 = 1.0 / 255.0;

  // do some adjustments
  fill *= 0.2;
  brightness = (brightness - 1.0) * 0.75 + 1.0;
  if (brightness < 1.0) {
    brightness_a = brightness;
    brightness_b = 0.0;
  } else {
    brightness_b = brightness - 1.0;
    brightness_a = 1.0 - brightness_b;
  }
  contrast = contrast * 0.5;
  contrast = (contrast - 0.5) * 0.75 + 0.5;
  temperature = (temperature / 2000.0) * 0.1;
  if (temperature > 0.0) temperature *= 2.0;
  splitPoint = ((splitPoint + 1.0) * 0.5);

  // apply to pixels
  var sz = imageData.width * imageData.height;
  var data = imageData.data;
  for (var j = 0; j < sz; j++) {
    var r = data[j*4+0] * oo255;
    var g = data[j*4+1] * oo255;
    var b = data[j*4+2] * oo255;
    // convert RGB to YIQ
    // this is a less than ideal colorspace;
    // HSL would probably be better, but more expensive
    var y = 0.299 * r + 0.587 * g + 0.114 * b;
    var i = 0.596 * r - 0.275 * g - 0.321 * b;
    var q = 0.212 * r - 0.523 * g + 0.311 * b;
    i = i + temperature;
    q = q - temperature;
    i = i * saturation;
    q = q * saturation;
    y = (1.0 + blackPoint) * y - blackPoint;
    y = y + fill;
    y = y * brightness_a + brightness_b;
    y = FastGain(contrast, Clamp(y));

    if (y < splitPoint) {
      q = q + (shadowsHue * shadowsSaturation) * (splitPoint - y);
    } else {
      i = i + (highlightsHue * highlightsSaturation) * (y - splitPoint);
    }

    // convert back to RGB for display
    r = y + 0.956 * i + 0.621 * q;
    g = y - 0.272 * i - 0.647 * q;
    b = y - 1.105 * i + 1.702 * q;

    // clamping is "free" as part of the ImageData object
    data[j*4+0] = r * 255.0;
    data[j*4+1] = g * 255.0;
    data[j*4+2] = b * 255.0;
  }
}
