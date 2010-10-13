'use strict';

var MAX_FILE_SIZE = 2 * 1048576; // 2 MB

function init() {
  var canvas = document.getElementById('canvas');
  if (!canvas.getContext)
    return err('Looks like your browser does not support canvas. :(');

  canvas.addEventListener('click', lomo, false);
  document.body.addEventListener('dragenter', want, false);
  document.body.addEventListener('dragover', want, false);
  document.body.addEventListener('drop', drop, false);
  
  load('sf.jpg');
}

function load(src, blob) {
  var image = new Image;
  image.onload = function() {
    draw(this);
    if (window.revokeBlobURL)
      window.revokeBlobURL(this.src);
  };
  image.src = src;
}

function draw(image) {
  var canvas = document.getElementById('canvas');
  var maxWidth = innerWidth - 16, maxHeight = innerHeight - 16;
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  if (canvas.width > maxWidth) {
    canvas.height *= maxWidth / canvas.width;
    canvas.width = maxWidth;
  }
  if (canvas.height > maxHeight) {
    canvas.width *= maxHeight / canvas.height;
    canvas.height = maxHeight;
  }
  var context = canvas.getContext('2d');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  canvas.image = image;
  canvas.lomo = false;
  canvas.className = 'loaded';
}

function lomo(e) {
  var canvas = document.getElementById('canvas');
  if (!canvas.image)
    return;

  var context = canvas.getContext('2d');
  context.drawImage(canvas.image, 0, 0, canvas.width, canvas.height);

  canvas.lomo = !canvas.lomo;
  // XXX hack for vignette
  canvas.style.backgroundColor = canvas.lomo ? '#000' : '';
  if (!canvas.lomo)
    return;

  var pxls = context.getImageData(0, 0, canvas.width, canvas.height);
  
  // apply basic processing
  process(pxls, { contrast: 1.2, saturation: 1.2, temperature: 200 });

  // TODO: rewrite this so-so vignette
  var row, col;
  var w = canvas.width, h = canvas.height;
  var x = e ? (e.clientX - canvas.offsetLeft - w / 2) / 16 + w / 2 : w / 2;
  var y = e ? (e.clientY - canvas.offsetTop - h / 2) / 16 + h / 2 : h / 2;
  for (row = 0; row < h; row++) {
    for (col = 0; col < w; col++) {
      // modify the alpha channel
      pxls.data[(row * w + col) * 4 + 3] =
        (1 - Math.pow((col - x) / w * 2, 4)) *
        (1 - Math.pow((row - y) / h * 2, 4)) *
        255 + 16; // + 16 is just a lower bound
    }
  }
  
  context.putImageData(pxls, 0, 0);
}

function process(imageData, params) {
  // wish IE9 had read/write __proto__
  var proto = {
    saturation:           1.0, // [0, 2]
    contrast:             1.0, // [0, 2]
    brightness:           1.0, // [0, 2]
    blackPoint:           0.0, // [0, 1]
    fill:                 0.0, // [0, 1]
    temperature:          0.0, // [-2000, 2000]
    shadowsHue:           0.5, // [0, 1]
    shadowsSaturation:    0.0, // [0, 2]
    highlightsHue:        0.5, // [0, 1]
    highlightsSaturation: 0.0, // [0, 2]
    splitPoint:           0.0  // [-1, 1]
  }
  for (var param in params)
    proto[param] = params[param];
  ProcessImageData(imageData, proto);
}

function want(e) {
  // XXX this seems to break drag-and-drop in Gecko
  if (~navigator.userAgent.indexOf('WebKit'))
    e.dataTransfer.dropEffect = 'copy';
  e.preventDefault();
}

function drop(e) {
  e.preventDefault();

  var data = e.dataTransfer;
  if (!data || !data.files.length)
    return;

  var file = data.files[0];
  if (!file)
    return;
  if (file.size > MAX_FILE_SIZE)
    return err('File cannot be larger than 2 MB!');
  if (!~['image/jpeg', 'image/png', 'image/gif'].indexOf(file.type))
    return err('File must be an image!');
  if (window.createBlobURL)
    load(window.createBlobURL(file));
  else if (window.FileReader) {
    var reader = new FileReader();
    reader.onload = function() {
      load(this.result);
    };
    reader.readAsDataURL(file);
  }
  else
    err('Looks like your browser does not support file drag-and-drop. :(');
}

function err(msg) {
  var div = document.body.appendChild(document.createElement('div'));
  div.className = 'error';
  div.textContent = msg;
  setTimeout(function() {
    div.style.opacity = 0;
    setTimeout(function() {
      document.body.removeChild(div);
    }, 800);
  }, 1200);
}

if (window.addEventListener)
  window.addEventListener('load', init, false);
