const getStyle = (element) => {
  if (!element.style) {
    element.style = {};
  }
  if (element.computedStyle['justify-content']) {
    element.computedStyle.justifyContent = element.computedStyle['justify-content'];
  }
  if (element.computedStyle['align-items']) {
    element.computedStyle.alignItems = element.computedStyle['align-items'];
  }
  if (element.computedStyle['align-self']) {
    element.computedStyle.alignSelf = element.computedStyle['align-self'];
  }
  if (element.computedStyle['flex-wrap']) {
    element.computedStyle.flexWrap = element.computedStyle['flex-wrap'];
  }
  if (element.computedStyle['flex-direction']) {
    element.computedStyle.flexDirection = element.computedStyle['flex-direction'];
  }
  if (element.computedStyle['align-content']) {
    element.computedStyle.alignContent = element.computedStyle['align-content'];
  }

  for (const prop in element.computedStyle) {
    element.style[prop] = element.computedStyle[prop].value;
    if (element.style[prop].toString().match(/px$/)) {
      element.style[prop] = parseInt(element.style[prop]);
    }
    if (element.style[prop].toString().match(/^[0-9\.]+$/)) {
      element.style[prop] = parseInt(element.style[prop]);
    }
  }
  return element.style;
}

const layout = (element) => {
  if (!element.computedStyle) {
    return;
  }

  let style = getStyle(element);
  if (style.display !== 'flex') {
    return;
  }

  const items = element.children.filter(i => i.type === 'element');
  items.sort((a, b) => {
    return (a.order || 0) - (b.order || 0);
  });

  ['width', 'height'].forEach(size => {
    if (style[size] === 'auto' || style[size] === '') {
      style[size] = null;
    }
  });

  if (!style.flexDirection || style.flexDirection === 'auto') {
    style.flexDirection = 'row';
  }
  if (!style.alignItems || style.alignItems === 'auto') {
    style.alignItems = 'stretch';
  }
  if (!style.alignItems || style.alignItems === 'auto') {
    style.alignItems = 'stretch';
  }
  if (!style.justifyContent || style.justifyContent === 'auto') {
    style.justifyContent = 'flex-start';
  }
  if (!style.flexWrap || style.flexWrap === 'auto') {
    style.flexWrap = 'noWrap';
  }
  if (!style.alignContent || style.alignContent === 'auto') {
    style.alignContent = 'stretch';
  }
  let mainSize,mainStart,mainEnd,mainSign,mainBase,
      crossSize,crossStart,crossEnd,crossSign,crossBase;
  if (style.flexDirection === 'row') {
    mainSize = 'width';
    mainStart = 'left';
    mainEnd = 'right';
    mainSign = +1;
    mainBase = 0;

    crossSize = 'height';
    crossStart = 'top';
    crossEnd = 'bottom';
  }
  if (style.flexDirection === 'row-reverse') {
    mainSize = 'width';
    mainStart = 'right';
    mainEnd = 'left';
    mainSign = -1;
    mainBase = style.width;

    crossSize = 'height';
    crossStart = 'top';
    crossEnd = 'bottom';
  }
  if (style.flexDirection === 'column') {
    mainSize = 'height';
    mainStart = 'top';
    mainEnd = 'bottom';
    mainSign = +1;
    mainBase = 0;

    crossSize = 'width';
    crossStart = 'left';
    crossEnd = 'right';
  }
  if (style.flexDirection === 'column-reverse') {
    mainSize = 'height';
    mainStart = 'bottom';
    mainEnd = 'top';
    mainSign = -1;
    mainBase = style.height;

    crossSize = 'width';
    crossStart = 'left';
    crossEnd = 'right';
  }

  if (style.flexWrap === 'wrap-reverse') {
    let tem = crossStart;
    crossStart = crossEnd;
    crossEnd = tem;
    crossSign = -1;
  } else {
    crossBase = 0;
    crossSign = 1;
  }

  let isAutoMainSize = false;

  if (!style[mainSize]) {
    style[mainSize] = 0;
    for (let i = 0; i < items.length; i++) {
      let item = items[i];
      let itemStyle = getStyle(item);
      if (itemStyle[mainSize] !== null && itemStyle[mainSize] !== (void 0)) {
        style[mainSize] = style[mainSize] + itemStyle[mainSize];
      }
    }
    isAutoMainSize = true;
  }

  let flexLine = [];
  let flexLines = [flexLine];

  let mainSpace = style[mainSize];

  let crossSpace = 0;

  for (let i = 0; i < items.length; i++) {
    let item = items[i];
    let itemStyle = getStyle(item);
    if (itemStyle[mainSize] === null) {
      itemStyle[mainSize] = 0;
    }

    if (itemStyle.flex) {
      flexLine.push(item);
    } else if (style.flexWrap === 'noWrap' && isAutoMainSize) {
      mainSpace -= itemStyle[mainSize];
      if (itemStyle[crossSize] !== null && itemStyle[crossSize] !== (void 0)) {
        crossSpace = Math.max(crossSpace, itemStyle[crossSize]);
      }
      flexLine.push(item);
    } else {
      if (itemStyle[mainSize] > style[mainSize]) {
        itemStyle[mainSize] = style[mainSize];
      }
      if (mainSpace < itemStyle[mainSize]) {
        // flexLine 指针为前一个
        flexLine.mainSpace = mainSpace;
        flexLine.crossSpace = crossSpace;
        // flexLine 指针为后一个
        flexLine = [item];
        flexLines.push(flexLine);
        mainSpace= style[mainSize];
        crossSpace = 0;
      } else {
        flexLine.push(item);
      }
      if (itemStyle[crossSize] !== null && itemStyle[crossSize] !== (void 0)) {
        crossSpace = Math.max(crossSpace, itemStyle[crossSize]);
      }
      mainSpace -= itemStyle[mainSize];
    }
  }
  flexLine.mainSpace = mainSpace;

  if (style.flexWrap === 'noWrap' || isAutoMainSize) {
    flexLine.crossSpace = (style[crossSize] !== (void 0)) ? style[crossSize] : crossSpace;
  } else {
    flexLine.crossSpace = crossSpace;
  }

  //  compute main 
  if (mainSpace < 0) {
    let scale = style[mainSize] / (style[mainSize] - mainSpace);
    let currentMain = mainBase;
    for (let i = 0; i < items.length; i++) {
      let item = items[i];
      let itemStyle = getStyle(item);
      if (itemStyle[flex]) {
        itemStyle[mainSize] = 0;
      }
      itemStyle[mainSize] = itemStyle[mainSize] * scale;
      itemStyle[mainStart] = currentMain;
      itemStyle[mainEnd] = itemStyle[mainStart] + mainSign * itemStyle[mainSize];
      currentMain = itemStyle[mainEnd];
    }
  } else {
    flexLines.forEach((items) => {
      let mainSpace = items.mainSpace;
      let flexTotal = 0;
      for (let i = 0; i < items.length; i++) {
        let item = items[i];
        let itemStyle = getStyle(item);
        if (itemStyle.flex !== null && itemStyle.flex !== (void 0)) {
          flexTotal += itemStyle.flex;
          continue;
        }
      }
      console.log(555, style, flexTotal, style.justifyContent);
      if (flexTotal > 0) {
        let currentMain = mainBase;
        for (let i = 0; i < items.length; i++) {
          let item = items[i];
          let itemStyle = getStyle(item);
          console.log(5566, itemStyle);
          if (itemStyle.flex) {
            itemStyle[mainSize] = mainSpace * (itemStyle.flex/flexTotal);
          }
          itemStyle[mainStart] = currentMain;
          itemStyle[mainEnd] = itemStyle[mainStart] + mainSign * itemStyle[mainSize];
          currentMain = itemStyle[mainEnd];

          console.log(556677, itemStyle);
        }
      } else {
        // step 元素间隔
        let currentMain,step;
        if (style.justifyContent === 'flex-start') {
          currentMain = mainBase;
          step = 0;
        } else if (style.justifyContent === 'flex-end') {
          currentMain = mainSpace * mainSign + mainBase;
          step = 0;
        } else if (style.justifyContent === 'flex-center') {
          currentMain = (mainSpace/2) * mainSign + mainBase;
          step = 0;
        } else if (style.justifyContent === 'space-between') {
          step = mainSpace / (items.length - 1) * mainSign;
          currentMain = mainBase;
        } else if (style.justifyContent === 'space-around') {
          step = mainSpace / items.length * mainSign;
          currentMain = step / 2 + mainBase;
          console.log(666, step, currentMain);
        }

        for (let i = 0; i < items.length; i++) {
          let item = items[i];
          let itemStyle = getStyle(item);
          itemStyle[mainStart] = currentMain;
          itemStyle[mainEnd] = itemStyle[mainStart] + mainSign * itemStyle[mainSize];
          currentMain = itemStyle[mainEnd] + step;
        }
      }
      console.log(7777, items);
    });
  }
  // compute cross

  if (!style[crossSize]) {
    crossSpace = 0;
    style[crossSize] = 0;
    for (let i = 0; i < flexLines.length; i++) {
      style[crossSize] = style[crossSize] + flexLines[i].crossSpace;
    }
  } else {
    crossSpace = style[crossSize];
    for (let i = 0; i < flexLines.length; i++) {
      crossSpace -= flexLines[i].crossSpace;
    }
  }

  if (style.flexWrap === 'wrap-reverse') {
    crossBase = style[crossSize];
  } else {
    crossBase = 0;
  }

  let lineSize = style[crossSize] / flexLines.length;
  let step;
  console.log(11111, style);
  if (style.alignContent === 'flex-start') {
    crossBase += 0;
    step = 0;
  } else if (style.alignContent === 'flex-end') {
    crossBase += crossSign * crossSpace;
    step = 0;
  } else if (style.alignContent === 'center') {
    crossBase += crossSign * crossSpace / 2;
    step = 0;
  } else if (style.alignContent === 'space-between') {
    crossBase += 0;
    step = crossSpace / (flexLines.length - 1);
  } else if (style.alignContent === 'space-around') {
    step = crossSpace / (flexLines.length);
    crossBase += crossSign * step / 2;
  } else if (style.alignContent === 'stretch') {
    step = 0;
    crossBase += 0;
  }

  flexLines.forEach(items => {
    let lineCrossSize = style.alignContent === 'stretch' ?
      items.crossSpace + crossSpace / flexLine.length :
      items.crossSpace;
    console.log(222222, JSON.stringify(lineCrossSize), crossSpace);
    for (let i = 0; i < items.length; i++) {
      let item = items[i];
      let itemStyle = getStyle(item);

      let align = itemStyle.alignSelf || style.alignItems;
      console.log(33333, align, itemStyle);

      if (itemStyle[crossSize] === null || itemStyle[crossSize] === (void 0)) {
        itemStyle[crossSize] = (align === 'stretch') ? lineCrossSize : 0;
      }
      if (align === 'flex-start') {
        itemStyle[crossStart] = crossBase;
        itemStyle[crossEnd] = itemStyle[crossStart] + crossSign * itemStyle[crossSize]
      } else if (align === 'flex-end') {
        itemStyle[crossEnd] = crossBase + crossSign * lineCrossSize;
        itemStyle[crossStart] = itemStyle[crossEnd] - crossSign * itemStyle[crossSize];
      } else if (align === 'center') {
        itemStyle[crossStart] = crossBase + crossSign * (lineCrossSize - itemStyle[crossSize]) / 2;
        itemStyle[crossEnd] = itemStyle[crossStart] + crossSign * itemStyle[crossSize];
      } else if (align === 'stretch') {
        itemStyle[crossStart] = crossBase;
        itemStyle[crossEnd] = crossBase + crossSign * (itemStyle[crossSize]);
        itemStyle[crossSize] = crossSign * (itemStyle[crossEnd] - itemStyle[crossStart] )
      }
    }
    crossBase += crossSign * (lineCrossSize + step);

    console.log(123123, items);
  });




  // console.log(999, flexLines, );
}

module.exports.layout = layout;