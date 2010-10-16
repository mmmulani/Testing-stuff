/*
Copyright (c) 2010 Frank Yan, <http://frankyan.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

(function() {

// test for native support
var test = document.createElement('input');
test.type = 'range';
if (test.value == 50)
  return;

// test for required property support
if (!document.mozSetImageElement || !('MozAppearance' in test.style))
  return;

var isMac = ~navigator.oscpu.indexOf(' OS X ');

if (document.readyState == 'loading')
  document.addEventListener('DOMContentLoaded', initialize, false);
else
  initialize();
document.addEventListener('DOMNodeInserted', onTheFly, false);

function initialize() {
  // create slider affordance
  var appearance = isMac ? 'scale-horizontal' : 'scalethumb-horizontal';
  var thumb = document.createElement('hr');
  thumb.style.setProperty('-moz-appearance', appearance, 'important');
  thumb.style.setProperty('position', 'fixed', 'important');
  thumb.style.setProperty('top', '-999999px', 'important');
  document.body.appendChild(thumb);
  document.mozSetImageElement('__sliderthumb__', thumb);
  // create initial sliders
  Array.forEach(document.querySelectorAll('input[type=range]'), create);
}

function onTheFly(e) {
  if (e.target.localName != 'input')
    return;
  setTimeout(function(input) {
    if (input.getAttribute('type') == 'range')
      create(input);
  }, 0, e.target);
}

function create(slider) {

  var value, min, max, step;
  var isValueSet, areAttrsSet, isChanged, range, prevValue, rawValue, prevX;

  // since any previous changes are unknown, assume element was just created
  if (slider.value !== '')
    value = slider.value;
  // implement value property properly
  slider.__defineGetter__('value', function() {
    return '' + value;
  });
  slider.__defineSetter__('value', function(val) {
    value = '' + val;
    isValueSet = true;
    draw();
  });
  // set up for onchange implementation
  var onChange = document.createEvent('HTMLEvents');
  onChange.initEvent('change', false, false);

  // sync properties with attributes
  ['min', 'max', 'step'].forEach(function(prop) {
    if (slider.hasAttribute(prop))
      areAttrsSet = true;
    slider.__defineGetter__(prop, function() {
      return this.hasAttribute(prop) ? this.getAttribute(prop) : '';
    });
    slider.__defineSetter__(prop, function(val) {
      val === null ? this.removeAttribute(prop) : this.setAttribute(prop, val);
    });
  });

  // initialize slider
  var thumb = {
    radius: isMac ? 9 : 6,
    width: isMac ? 22 : 12,
    height: isMac ? 16 : 20
  };
  var track = '-moz-linear-gradient(top, transparent ' +
    (isMac ? '6px, #666 6px, #bbb' : '9px, #999 9px, #bbb 10px, #fff') +
    ' 11px, transparent 11px, transparent)';
  var styles = {
    'font-size': 0, // -moz-user-select: none breaks onmousemove, so use this
    'color': 'transparent',
    'min-width': thumb.width + 'px',
    'min-height': thumb.height + 'px',
    'max-height': thumb.height + 'px',
    padding: 0,
    border: 0,
    'border-radius': '99px',
    cursor: 'default'
  };
  for (var prop in styles)
    slider.style.setProperty(prop, styles[prop], 'important');
  if (getComputedStyle(slider, 0).width == thumb.width + 'px')
    slider.style.width = '129px'; // match WebKit just for giggles
  update();

  slider.addEventListener('DOMAttrModified', function(e) {
    // note that value attribute only sets initial value
    if (e.attrName == 'value' && !isValueSet) {
      value = e.newValue;
      draw();
    }
    else if (~['min', 'max', 'step'].indexOf(e.attrName)) {
      update();
      areAttrsSet = true;
    }
  }, false);

  slider.addEventListener('mousedown', onDragStart, false);

  function onDragStart(e) {
    if (!range)
      return;
    var width = parseFloat(getComputedStyle(this, 0).width);
    var multiplier = (width - thumb.width) / range;
    // distance between click and center of thumb
    var dev = e.clientX - this.getBoundingClientRect().left - thumb.width / 2 -
              (value - min) * multiplier;
    // if click was not on thumb, move thumb to click location
    if (Math.abs(dev) > thumb.radius) {
      isChanged = true;
      this.value -= -dev / multiplier;
    }
    rawValue = value;
    prevX = e.clientX;
    this.addEventListener('mousemove', onDrag, false);
    this.addEventListener('mouseup', onDragEnd, false);
  }

  function onDrag(e) {
    var width = parseFloat(getComputedStyle(this, 0).width);
    rawValue += (e.clientX - prevX) * range / (width - thumb.width);
    prevX = e.clientX;
    isChanged = true;
    this.value = rawValue;
  }

  function onDragEnd() {
    this.removeEventListener('mousemove', onDrag, false);
    this.removeEventListener('mouseup', onDragEnd, false);
  }

  // determines whether value is valid number in attribute form
  function isAttrNum(value) {
    return !isNaN(value) && +value == parseFloat(value, 10);
  }

  // validates min, max, and step attributes/properties and redraws
  function update() {
    min = isAttrNum(slider.min) ? +slider.min : 0;
    max = isAttrNum(slider.max) ? +slider.max : 100;
    step = isAttrNum(slider.step) ? +slider.step : 1;
    range = max - min;
    draw(true);
  }

  // recalculates value property
  function calc() {
    if (!isValueSet && !areAttrsSet)
      value = slider.getAttribute('value');
    if (!isAttrNum(value))
      value = (min + max) / 2;;
    // snap to step intervals (WebKit sometimes does not - bug?)
    value = Math.round((value - min) / step) * step + min;
    if (value < min)
      value = min;
    else if (value > max)
      value = min + ~~(range / step) * step;
  }

  // renders slider using CSS background ;)
  function draw(dirty) {
    calc();
    if (isChanged && value != prevValue)
      slider.dispatchEvent(onChange);
    isChanged = false;
    // prevent unnecessary redrawing
    if (!dirty && value == prevValue)
      return;
    prevValue = value;
    var position = range ? (value - min) / range * 100 : 0;
    slider.style.background =
      '-moz-element(#__sliderthumb__) ' + position + '% no-repeat, ' + track;
  }

}

})();
