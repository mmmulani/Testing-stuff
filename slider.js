(function() {

// test for native support
var test = document.createElement('input');
test.type = 'range';
if (test.value == '50')
  return;
// since shim requires CSS box-shadow, return if unsupported
if (!('boxShadow' in test.style))
  return;

window.addEventListener('load', function() {
  var sliders = document.querySelectorAll('input[type=range]');
  Array.prototype.forEach.call(sliders, create);
}, false);

function create(slider) {

  function onDragStart(e) {
    var mid = (this.min + this.max) / 2;
    var range = this.max - this.min;
    var multiplier = this.width / range;
    var dev = Math.abs(this.value - mid) * multiplier;
    var x = e.clientX - this.offsetLeft;
    // distance between click and center of nub
    var diff = x - this.width / 2 - dev;
    // whether click was within control bounds
    var valid = this.value < mid ? x > 2 * dev - 5 : x < this.width + 10;
    if (!valid)
      return;
    // if click was not on nub, move nub to click location
    if (diff < -5 || diff > 5) {
      this.v = this.value - -diff / multiplier;
      this.value = this.v;
      this.draw();
    }
    this.move = 1;
    this.v = this.value;
    this.x = e.clientX;
  }

  function onDrag(e) {
    if (!this.move)
      return;
    this.v -= (this.x - e.clientX) * (this.max - this.min) / this.width;
    this.x = e.clientX;
    this.value = this.v;
    this.draw();
  }

  function onDragEnd() {
    this.move = 0;
  }

  slider.width = parseInt(getComputedStyle(slider, 0).width);
  slider.min = '' + slider.getAttribute('min');
  slider.max = '' + slider.getAttribute('max');
  slider.step = '' + slider.getAttribute('step');

  slider.calc = function() {
    // if invalid, reset min to 0, max to 100, and/or step to 1
    this.min = isNaN(this.min) ? 0 : +this.min;
    this.max = isNaN(this.max) || this.max < this.min ? 100 : +this.max;
    this.step = isNaN(this.step) ? 1 : +this.step;
    // if invalid, reset value to mean of min and max
    if (isNaN(this.value) || this.value === '')
      this.value = (this.min + this.max) / 2;
    // snap to step intervals
    this.value = Math.round((this.value - this.min) / this.step);
    this.value = this.value * this.step + this.min;
    // clamp to [min, max]
    if (this.value < this.min)
      this.value = this.min;
    else if (this.value > this.max)
      this.value = this.min + ~~((this.max - this.min) / this.step) * this.step;
  };

  slider.draw = function() {
    this.calc();
    // style the control
    var mid = (this.min + this.max) / 2;
    var range = this.max - this.min;
    var multiplier = this.width / range;
    var dev = Math.abs(this.value - mid) * multiplier;
    this.style.width = this.width + 2 * dev + 'px';
    this.style.marginLeft = (this.value < mid ? -dev * 2 : 0) + 5 + 'px';
    this.style.marginRight = (this.value > mid ? -dev * 2 : 0) + 5 + 'px';
    var shadow = [], style = 'px 0 0 #444';
    // experimental thin style
    if (~slider.className.split(' ').indexOf('x-thin'))
      style = 'px 2px 0 -6px #555';
    var end = (this.max - this.value) * multiplier;
    for (var i = (this.min - this.value) * multiplier; i < end; i += 4)
      shadow.push(i + style);
    shadow.push(end + style);
    this.style.boxShadow = shadow.join();
  };

  slider.draw();

  slider.addEventListener('mousedown', onDragStart, false);
  slider.addEventListener('mousemove', onDrag, false);
  slider.addEventListener('mouseout', onDragEnd, false);
  slider.addEventListener('mouseup', onDragEnd, false);

  // XXX stop the focus ring from distorting the box shadow
  slider.addEventListener('focus', function() {
    this.blur();
  }, false);

}

})();
