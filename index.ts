import Canvas2DEngine from './src/index';
import { Rect, Circle } from './src/index';
const container = document.getElementById('app') as HTMLDivElement;
const canvasIns = Canvas2DEngine.init(container, {});
const nodeRect = [
  {
    x: 25,
    y: 25,
    width: 100,
    height: 100,
    color: 'pink',
  },
  {
    x: 45,
    y: 45,
    width: 60,
    height: 60,
    type: 'clear',
  },
  {
    x: 50,
    y: 50,
    width: 50,
    height: 50,
    type: 'stroke',
    color: 'red',
  },
];
const linePoints = [
  {
    x: 160,
    y: 100,
  },
  {
    x: 135,
    y: 120,
  },
  {
    x: 135,
    y: 75,
  },
];
console.log(canvasIns);
let circle = new Circle({
  shape: {
    cx: 300,
    cy: 300,
    r: 100,
  },
  style: {
    fill: 'blue',
  },
  draggable: true,
});
circle.on('mousedown', () => {
  console.log('mousedown');
});
circle.on('mousemove', () => {
  console.log('mousemove');
});
canvasIns.add(circle);

canvasIns.add(
  new Circle({
    shape: {
      cx: 100,
      cy: 100,
      r: 100,
    },
  })
);
canvasIns.add(
  new Circle({
    shape: {
      cx: 100,
      cy: 100,
      r: 100,
    },
  })
);
canvasIns.add(
  new Rect({
    shape: {
      x: 20,
      y: 100,
      width: 100,
      height: 100,
    },
    style: {
      fill: 'none',
      stroke: 'red',
    },
  })
);
