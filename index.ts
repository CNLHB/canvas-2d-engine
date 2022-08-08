import Canvas2DEngine from './src/index';
import { Rect, Circle } from './src/index';
const container = document.getElementById('app') as HTMLDivElement;
const canvasIns = Canvas2DEngine.init(container, {});
console.log(canvasIns);
let circle = new Circle({
  shape: {
    cx: 300,
    cy: 300,
    r: 50,
  },
  style: {
    fill: 'blue',
  },
  draggable: true,
});
canvasIns.add(circle);
circle.on('mouseover', function () {
  canvasIns.dom.style.cursor = 'move';
});
circle.on('mouseout', function () {
  canvasIns.dom.style.cursor = 'default';
});
const circle2 = new Circle({
  shape: {
    cx: 100,
    cy: 100,
    r: 100,
  },
});
circle2.on('dragenter', function () {
  console.log('dragenter');
  this.setStyle('fill', 'red');
});
let c = 100;

setInterval(() => {
  if (c > 300) {
    c = 50;
  }
}, 16);
// .on('dragleave', function () {
//   this.setStyle('fill', 'black');
// })
// .on('drop', function () {
//   this.setStyle('fill', 'green');
// });
canvasIns.add(circle2);
canvasIns.add(
  new Rect({
    shape: {
      x: 20,
      y: 100,
      width: 100,
      height: 100,
    },
    draggable: 'horizontal',
    style: {
      fill: 'none',
      stroke: 'yellow',
    },
  })
);
canvasIns.configLayer(0, {
  // clearColor: 'rgba(255, 255, 255, 0.1)'
  motionBlur: true,
  lastFrameAlpha: 0.99,
});
