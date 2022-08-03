export function getElementTop(elem, type = 'top') {
  var elemTop = type === 'top' ? elem.offsetTop : elem.offsetLeft; //获得elem元素距相对定位的父元素的top

  elem = elem.offsetParent; //将elem换成起相对定位的父元素

  while (elem != null) {
    //只要还有相对定位的父元素

    //获得父元素 距他父元素的top值,累加到结果中

    elemTop += type === 'top' ? elem.offsetTop : elem.offsetLeft;

    //再次将elem换成他相对定位的父元素上;

    elem = elem.offsetParent;
  }
  return elemTop;
}
