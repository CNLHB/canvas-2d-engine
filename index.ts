import Canvas2DEngine from './src/index';
import { Rect } from './src/index';
const container = document.getElementById('app') as HTMLDivElement;
const canvas = document.createElement('canvas');
container.appendChild(canvas);
const render = new Canvas2DEngine({
  el: canvas,
});
render.add(new Rect(0, 0, 100, 100));
console.log(render);
