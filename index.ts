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
// nodeRect.forEach((rect) => {
//   canvasIns.drawRect(rect);
// });
// canvasIns.drawLine({
//   points: linePoints,
//   type: 'stroke',
//   close: true,
// });
// canvasIns.drawCircle(75, 75, 50);
// canvasIns.clear();
console.log(canvasIns);
let circle = new Circle({
  shape: {
    cx: 300,
    cy: 300,
    r: 100,
  },
});
circle.on('mousedown', () => {
  console.log('mousedown');
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
