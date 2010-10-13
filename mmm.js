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
  vignetteCircular(canvas.width / 2, canvas.height / 2, rad, hard);
}

function vignetteCircular(cx, cy, rad, hard) {
  // Array of size width*height*4.
  // Each pixel has a separate RGBA byte in the array.
  var pixels = context.getImageData(0, 0, canvas.width, canvas.height);

  var px,py;
  var w = canvas.width, h = canvas.height;

  for (py = 0; py < h; py++) {
    for (px = 0; px < w; px++) {
      var ratio = w/h;
      var dx = (w/2) - px, dy = (h/2) - py;
      var dist = Math.sqrt((dx*dx) + ratio*ratio*(dy*dy));
      var index = (py * w + px) * 4;

      var r = pixels.data[index + 0];
      var g = pixels.data[index + 1];
      var b = pixels.data[index + 2];

      // Convert to the YIQ colourspace.
      var y = 0.299*r + 0.587*g + 0.114*b;
      var i = 0.595716*r - 0.274453*g - 0.321263*b;
      var q = 0.211456*r - 0.522591*g + 0.311135*b;

      // Darken if outside the shadow bound.
      var diff = (dist - rad) / rad;
      if (diff > 0)
        y *= Math.pow(Math.E, -1 * hard * 10 * diff * diff);

      // Convert back to RGB.
      r = y + 0.9563*i + 0.621*q;
      g = y - 0.2721*i - 0.6473*q;
      b = y - 1.1070*i + 1.7046*q;

      pixels.data[index + 0] = r;
      pixels.data[index + 1] = g;
      pixels.data[index + 2] = b;
      //pixels.data[index + 3] = dist > rad ? 235 : 255;
    }
  }

  context.putImageData(pixels, 0, 0);
}
