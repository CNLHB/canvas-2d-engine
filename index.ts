import Canvas2DEngine from './src/index';
import { Rect } from './src/index';
const container = document.getElementById('app') as HTMLDivElement;
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
container.appendChild(canvas);
const canvasIns = new Canvas2DEngine({
  el: canvas,
});
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
canvasIns.drawCircle(75, 75, 50);
// canvasIns.clear();
console.log(canvasIns);
