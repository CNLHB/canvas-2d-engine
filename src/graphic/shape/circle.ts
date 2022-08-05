/**
 * 圆形
 */

import Path from '../Path';

export default class Circle extends Path {
  type: string = 'circle';
  shape: any = {
    cx: 0,
    cy: 0,
    r: 0,
  };

  buildPath(ctx, shape, inBundle) {
    // Better stroking in ShapeBundle
    // Always do it may have performance issue ( fill may be 2x more cost)
    if (inBundle) {
      ctx.moveTo(shape.cx + shape.r, shape.cy);
    }
    // else {
    //     if (ctx.allocate && !ctx.data.length) {
    //         ctx.allocate(ctx.CMD_MEM_SIZE.A);
    //     }
    // }
    // Better stroking in ShapeBundle
    // ctx.moveTo(shape.cx + shape.r, shape.cy);
    ctx.arc(shape.cx, shape.cy, shape.r, 0, Math.PI * 2, true);
  }
}
