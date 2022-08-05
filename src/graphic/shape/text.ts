/**
 *
 */
export default class Text {
  x: number;
  y: number;
  height: number;
  width: number;
  fillStyle: string;
  font: string;
  text: string;
  constructor(
    x: number,
    y: number,
    height: number,
    width: number,
    fillStyle: string,
    text: string
  ) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.fillStyle = fillStyle;
    this.text = text;
  }
  update() {}
  draw() {}
}
