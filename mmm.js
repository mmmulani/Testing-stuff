'use strict';

var imgs = [];
var imgURLs = ["imgs/2876463757_a920992b81_b.jpg"];
var canvas, context;

function init() {
  // Create controls and events for them.
  var effectsControls = ["radius-slider", "hard-slider", "blur-slider",
                         "crossproc-toggle"];
  for (var i = 0; i < effectsControls.length; i++)
    document.getElementById(effectsControls[i]).addEventListener("change",
      applyEffects, false);
  document.getElementById("crop-slider").addEventListener("change",
    function() { drawCropBox(_prevCropEvent); }, false);

  // Init canvas related declarations.
  canvas = document.getElementById("main");
  context = canvas.getContext("2d");

  // Load images.
  imgURLs.map(function(val,i,arr) {
    var img = new Image();
    img.onload = function () {
      arr.shift();
      // Case of all images done loading.
      if (arr.length == 0) {
        drawImages();
      }
    };
    img.src = val;
    imgs[i] = img;
  });
}

function drawImages() {
  imgs.forEach(function(img) {
    canvas.height = img.naturalHeight;
    canvas.width = img.naturalWidth;
    canvas.image = img;
    context.drawImage(img, 0, 0, canvas.width, canvas.height);
  });
}

function restoreCleanImage() {
  if (croppedImage) {
    canvas.width = _cropWidth;
    canvas.height = _cropHeight;
    context.drawImage(canvas.image, _cropLeft, _cropTop,
                      _cropWidth, _cropHeight, 0, 0, _cropWidth, _cropHeight);
  }
  else {
    canvas.width = canvas.image.naturalWidth;
    canvas.height = canvas.image.naturalHeight;
    context.drawImage(canvas.image, 0, 0);
  }
}

// This is directly called whenever the user modifies the image effects
// controls.
function applyEffects() {
  var rad = document.getElementById("radius-slider").value / 100 *
            canvas.width;
  var hard = document.getElementById("hard-slider").value;
  var blur = document.getElementById("blur-slider").value;
  var toXP = document.getElementById("crossproc-toggle").checked;

  _benchmark("aE", "starting alterEffects");
  restoreCleanImage();
  _benchmark("aE", "restored clean image");

  var pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  var yiqPixels = rgba2yiq(pixels.data);
  _benchmark("aE", "converted to yiq");

  var w = canvas.width, h = canvas.height;

  vignetteCircular(yiqPixels, w, h, w/2, h/2, rad, hard);
  _benchmark("aE", "applied vignette");

  if (blur >= 0.1) {
    gaussianBlur(yiqPixels, w, h, blur);
    _benchmark("aE", "blurred");
  }

  pixels = yiq2rgba(yiqPixels, w, h);
  _benchmark("aE", "converted to rgba");

  if (toXP) {
    crossProcess(pixels.data);
    _benchmark("aE", "cross processed");
  }

  context.putImageData(pixels, 0, 0);
}

function rgba2yiq(data) {
  //XXX: Alpha information is dropped.
  var toRet = [];
  for (var index = 0; index < data.length; index+=4) {
    var r = data[index + 0];
    var g = data[index + 1];
    var b = data[index + 2];

    // Convert to the YIQ colourspace.
    var y = 0.299*r + 0.587*g + 0.114*b;
    var i = 0.595716*r - 0.274453*g - 0.321263*b;
    var q = 0.211456*r - 0.522591*g + 0.311135*b;

    toRet.push(y,i,q);
  }
  return toRet;
}

function yiq2rgba(data, w, h) {
  var pixels = context.createImageData(w,h);
  var pixelIndex = 0;
  for (var index = 0; index < data.length; index+=3) {
    var y = data[index + 0];
    var i = data[index + 1];
    var q = data[index + 2];

    var r = y + 0.9563*i + 0.621*q;
    var g = y - 0.2721*i - 0.6473*q;
    var b = y - 1.1070*i + 1.7046*q;

    pixels.data[pixelIndex + 0] = r;
    pixels.data[pixelIndex + 1] = g;
    pixels.data[pixelIndex + 2] = b;
    // Set alpha to 255.
    pixels.data[pixelIndex + 3] = 255;

    pixelIndex += 4;
  }
  return pixels;
}

function vignetteCircular(pixels, w, h, cx, cy, rad, hard) {
  // Array of size width*height*3.
  // Each pixel is stored as YIQ.

  var px,py;
  for (py = 0; py < h; py++) {
    for (px = 0; px < w; px++) {
      var ratio = w/h;
      var dx = (w/2) - px, dy = (h/2) - py;
      var dist = Math.sqrt((dx*dx) + ratio*ratio*(dy*dy));
      var index = (py * w + px) * 3;

      var y = pixels[index + 0];

      // Darken if outside the shadow bound.
      var diff = (dist - rad) / rad;
      if (diff > 0)
        y *= Math.pow(Math.E, -1 * hard * 10 * diff * diff);

      pixels[index + 0] = y;
    }
  }
}

var _gaussian = [
  [6.7e-7,2.292e-5,1.9117e-4,3.8771e-4,1.9117e-4,2.292e-5,6.7e-7],
  [2.292e-5,7.8633e-4,6.55965e-3,1.330373e-2,6.55865e-3,7.8633e-4,2.292e-5],
  [1.9117e-4,6.55965e-3,0.05472157,0.11098164,0.05472157,6.55965e-3,1.9117e-4],
  [3.8771e-4,0.01330373,0.11098164,0.22508352,0.11098164,0.01330373,3.8711e-4],
  [1.9117e-4,6.55965e-3,0.05472157,0.11098164,0.05472157,6.55965e-3,1.9117e-4],
  [2.292e-5,7.8633e-4,6.55965e-3,1.330373e-2,6.55865e-3,7.8633e-4,2.292e-5],
  [6.7e-7,2.292e-5,1.9117e-4,3.8771e-4,1.9117e-4,2.292e-5,6.7e-7]];

function gaussianBlur(pixels, w, h, blur) {
  // Redefine _gaussian based on the blur parameter (acts as sigma).
  for (var x = -3; x < 4; x++) {
    for (var y = -3; y < 4; y++) {
      _gaussian[x+3][y+3] = (1/(2*Math.PI*blur*blur))*
        Math.pow(Math.E,(x*x+y*y)/(-2*blur*blur));
    }
  }

  var hw = w/2, hh = h/2;

  var newPixels = [];
  var px, py;
  for (py = 0; py < h; py++) {
    for (px = 0; px < w; px++) {
      var gx = Math.max(0,3-px);
      var gxl = 4+Math.min(3,w-px-1);
      var gyl = 4+Math.min(3,h-py-1);

      var total = 0;
      var totalGaussian = 0;
      for (; gx < gxl; gx++) {
        for (var gy = Math.max(0,3-py); gy < gyl; gy++) {
          var ax = px + (gx - 3);
          var ay = py + (gy - 3);
          totalGaussian += _gaussian[gy][gx];
          total += _gaussian[gy][gx]*pixels[(ay * w + ax) * 3];
        }
      }

      var origLum = pixels[(py * w + px) * 3];

      // Modulate the blur effectiveness based on distance from the center.
      var dist = (hw-px)*(hw-px) + (hh-py)*(hh-py);
      var blurPercent = 1-Math.pow(1-dist/(hw*hw + hh*hh),4);
      var pixelLum = (total/totalGaussian);
      var blurredLum = origLum * (1-blurPercent) + pixelLum * blurPercent;

      // Further modulate based on original luminosity. The goal is to blur
      // more near highlights.
      var lumPercent = Math.pow(origLum/255, 1.2);
      newPixels.push(blurredLum * (1-lumPercent) + origLum * lumPercent);
    }
  }

  for (var i = 0; i < newPixels.length; i++)
    pixels[i*3] = newPixels[i];
}

// crossProcess: Apply a cross processing filter over image.
// In-place modifies the pixels array, which is an RGBA pixel array.
function crossProcess(pixels) {
  // TODO: Up the contrast as well.

  function changePixelLevel(px, order) {
    // order == 0 => low then high
    // order == 1 => high then low
    order ^= +(px < 128);
    var val = (px < 128) ? px : px - 128;
    var x = val/128;
    // Scale d to down to lessen colour difference.
    var d = ((x*x) - x);
    return (px-val) + (order ? (1+d) : (1-d))*val;
  }

  // Iterate over each pixel.
  for (var i = 0; i < pixels.length; i += 4) {
    var r = pixels[i];
    var g = pixels[i+1];
    var b = pixels[i+2];

    pixels[i] = changePixelLevel(r, 0);
    pixels[i+1] = changePixelLevel(g, 0);
    pixels[i+2] = changePixelLevel(b, 1);
  }
}

// clipPx may be unnecessary for pixel data used in a CanvasPixelArray.
function clipPx(val) {
  return (val < 0) ? 0 :
         (val > 255) ? 255 :
         val;
}

function showCropControls() {
  croppedImage = false;
  restoreCleanImage();

  // TODO: Add interface to drag on canvas to select center and box size.

  canvas.addEventListener("mousemove", drawCropBox, false);
  canvas.addEventListener("click", setCropBox, false);
}

function hideCropControls() {
  canvas.removeEventListener("mousemove", drawCropBox, false);
  canvas.removeEventListener("click", setCropBox, false);

  document.getElementById("crop-box").style.display = "none";
}

// Store the previous event so we can accurately redraw the box after
// changing its size.
var _prevCropEvent;
function drawCropBox(event) {
  _prevCropEvent = event;
  if (!event)
    return;

  var box = document.getElementById("crop-box");
  var smallerSize = canvas.width < canvas.height ? canvas.width : canvas.height;
  var size = document.getElementById("crop-slider").value * smallerSize / 100;

  box.style.height = box.style.width = size + "px";

  // XXX: Change to using getBoundingClientRect() instead of offset{Left,Top}.

  var left = Math.min(Math.max(canvas.offsetLeft, event.pageX - (size/2)),
                      canvas.offsetLeft + canvas.offsetWidth - size);
  var top = Math.min(Math.max(canvas.offsetTop, event.pageY - (size/2)),
                     canvas.offsetTop + canvas.offsetHeight - size);

  box.style.left = left-2 + "px";
  box.style.top = top-2 + "px";

  box.style.display = "block";
}

var croppedImage = false;
var _cropLeft,_cropTop,_cropWidth,_cropHeight;
function setCropBox(event) {
  var smallerSize = canvas.width < canvas.height ? canvas.width : canvas.height;
  var size = document.getElementById("crop-slider").value * smallerSize / 100;

  var left = Math.min(Math.max(canvas.offsetLeft, event.pageX - (size/2)),
                      canvas.offsetLeft + canvas.offsetWidth - size);
  var top = Math.min(Math.max(canvas.offsetTop, event.pageY - (size/2)),
                     canvas.offsetTop + canvas.offsetHeight - size);

  _cropLeft = left - canvas.offsetLeft;
  _cropTop = top - canvas.offsetTop;
  _cropWidth = _cropHeight = size;

  croppedImage = true;

  restoreCleanImage();

  hideCropControls();
}

var _benchmarks = {};
function _benchmark(name, message) {
  if (typeof(_benchmarks[name]) == "undefined") {
    _benchmarks[name] = (new Date()).getTime();
    return;
  }

  var diff = (new Date()).getTime() - _benchmarks[name];
  _benchmarks[name] = (new Date()).getTime();
  if (typeof(console) != "undefined")
    console.log(name + ": " + message + " " + (diff/1000) + "s");
}
