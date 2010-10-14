window.addEventListener('load', function() {
  // since shim requires CSS box-shadow, return if unsupported
  if (!('boxShadow' in document.body.style))
    return;

  // test for native support
  var test = document.createElement('input');
  test.type = 'range';
  if (test.value == '50')
    return;

  var slider = document.querySelector('input[type=range]');
  if (!slider)
    return;
  slider.width = parseInt(getComputedStyle(slider, 0).width);

  // XXX stop the focus ring from distorting the box shadow
  slider.onfocus = function() {
    this.blur();
  };

  slider.adjust = function() {
    // if invalid, reset min to 0, max to 100, step to 1
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
    this.adjust();
    // style the control
    var mid = (this.min + this.max) / 2;
    var dev = this.value < mid ? mid - this.value : this.value - mid;
    this.style.width = this.width + 2 * dev + 'px';
    this.style.marginLeft = this.value < mid ? -dev * 2 + 'px' : 0;
    this.style.marginRight = this.value > mid ? -dev * 2 + 'px' : 0;
    var shadow = [];
    for (var i = this.min - this.value; i <= this.max - this.value; i ++)
      // shadow.push(i + 'px 2px 0 -6px #555');
      shadow.push(i + 'px 0 0 #444');
    this.style.boxShadow = shadow.join();
  };

  slider.draw();

  slider.onmousedown = function(e) {
    var mid = (this.min + this.max) / 2;
    var dev = this.value < mid ? mid - this.value : this.value - mid;
    var x = e.clientX - this.offsetLeft;
    // distance between click and center of nub
    var diff = x - dev - this.width / 2;
    // whether click was within control bounds
    var valid = this.value < mid ? x > 2 * dev - 5 : x < this.width + 10;
    if (!valid)
      return;
    // if click was not on nub, move nub to click location
    if (diff < -5 || diff > 5) {
      this.v = this.value - -diff;
      this.value = this.v;
      this.draw();
    }
    this.move = 1;
    this.v = this.value;
    this.x = e.clientX;
  };

  slider.onmousemove = function(e) {
    if (!this.move)
      return;
    this.v -= this.x - e.clientX;
    this.x = e.clientX;
    this.value = this.v;
    this.draw();
  };

  slider.onmouseup = slider.onmouseout = function() {
    this.move = 0;
  };
}, false);
