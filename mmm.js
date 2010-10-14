var imgs = [];
var imgURLs = ["511651674_04696b70a7_z.jpg"];
var canvas, context;
function init() {
  // Create controls and events for them.
  document.getElementById("radius-slider").addEventListener("change",
    function(event) {
      applyVignette(event.target.value / 100 * canvas.width,
                    document.getElementById("hard-slider").value);
    }, false);
  document.getElementById("hard-slider").addEventListener("change",
    function(event) {
      applyVignette(
        document.getElementById("radius-slider").value / 100 * canvas.width,
        event.target.value);
    }, false);

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

function applyVignette(rad, hard) {
  context.drawImage(canvas.image, 0, 0);
  var pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  var yiqPixels = rgba2yiq(pixels.data);

  var w = canvas.width, h = canvas.height;

  vignetteCircular(yiqPixels, w, h, canvas.width / 2, canvas.height / 2,
                   rad, hard);

  pixels = yiq2rgba(yiqPixels, w, h);
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

function gaussianBlur(pixels, w, h) {
  var px, py;
  for (py = 0; py < h; py++) {
    
  }
}
