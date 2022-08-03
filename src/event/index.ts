import { getElementTop } from '../utils/dom';

export function addEventListenerByDom(dom: HTMLElement) {
  const top = getElementTop(dom);
  const left = getElementTop(dom, 'left');
  console.log(top, left);

  dom.addEventListener('click', function (event) {
    const x = event.pageX - left;
    const y = event.pageY - top;
    console.log(x, y);
  });
}
