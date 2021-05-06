const EOF = Symbol('EOF');
const css = require('css');

const {layout} = require('./layout.js');

let currentToken = null;
let currentAttribute = null;
let currentTextNode = null;

let stack = [{type: 'document', children: []}];
let rules = [];
const addCSSRules = (text) => {
  var ast = css.parse(text);

  rules.push(...ast.stylesheet.rules);
}


const specificity = (selector) => {
  let p = [0,0,0,0];
  let selectorParts = selector.split(" ");
  for (let part of selectorParts) {
    if (part.charAt(0) === '#') {
      p[1] += 1;
    } else if (part.charAt(0) === '.') {
      p[2] += 1;
    } else {
      p[3] += 1;
    }
  }
  return p;
}
// [0,1,1,1], [0,2,0,0] -1
const compare = (sp1, sp2) => {
  if (sp1[0] - sp2[0]) {
    return sp1[0] - sp2[0];
  }
  if (sp1[1] - sp2[1]) {
    return sp1[1] - sp2[1];
  }
  if (sp1[2] - sp2[2]) {
    return sp1[2] - sp2[2];
  }

  return sp1[3] - sp2[3];
}

const match = (element, selector) => {
  // console.log(1, selector, element);
  if (!selector || !element.attributes) {
    return false;
  }

  if (selector.charAt(0) === '#') {
    let attr = element.attributes.filter(attr => attr.name === 'id')[0];
    if (attr && attr.value === selector.replace('#', '')) {
      return true
    }
  } else if (selector.charAt(0) === '.') {
    let attr = element.attributes.filter(attr => attr.name === 'class')[0];
    if (attr && attr.value === selector.replace('.', '')) {
      return true
    }
  } else {
    if (element.tagName === selector) {
      return true;
    }
  }
  return false;
}

const computeCSS = (element) => {
  // console.log(rules);
  // console.log("compute css with rules", element);
  // .slice() 不传参数拷贝
  let elements = stack.slice().reverse();

  if (!element.computedStyle) {
    element.computedStyle = {};
  }

  for (const rule of rules) {
    let selectorParts = rule.selectors[0].split(' ').reverse();
    if (!match(element, selectorParts[0])) {
      continue;
    }
    let matched = false;
    let j = 1;

    for (let i = 0; i < elements.length; i++) {
      if (match(elements[i], selectorParts[j])) {
        j++;
      }
    }

    if (j >= selectorParts.length) {
      matched = true;
    }

    if (matched) {
      // 匹配到
      // console.log(9999, element, rule);
      let computedStyle = element.computedStyle;
      let sp = specificity(rule.selectors[0]);
      // console.log('sp', rule.selectors[0], sp);
      for (let declaration of rule.declarations) {
        if (!computedStyle[declaration.property]) {
          computedStyle[declaration.property] = {};
        }

        if (!computedStyle[declaration.property].specificity) {
             computedStyle[declaration.property].value = declaration.value;
             computedStyle[declaration.property].specificity = sp;
        } else if (compare(computedStyle[declaration.property].specificity, sp) < 0) {
          computedStyle[declaration.property].value = declaration.value;
          computedStyle[declaration.property].specificity = sp;
        }

      }
    }
    // console.log(11, element.computedStyle);
  }
}

const emit = (token) => {
  // console.log('token:', token);
  let top = stack[stack.length - 1];
  if (token.type === 'startTag') {
    let element = {
      type: 'element',
      tagName: token.tagName,
      children: [],
      attributes: [],
    }

    for (const p in token) {
      if (p !== 'type' && p !== 'tagName') {
        element.attributes.push({
          name: p,
          value: token[p],
        });
      }
    }
    computeCSS(element);
    top.children.push(element);
    // element.parent = top;

    if (!token.isSelfClosing) {
      stack.push(element);
    }
    currentTextNode = null;

  } else if ( token.type === 'endTag') {
    if (top.tagName !== token.tagName) {
      throw new Error("tag start end not match")
    } else {
      /// 添加css 操作
      if (top.tagName === 'style') {
        addCSSRules(top.children[0].content);
      }
      layout(top);
      stack.pop();
    }
    currentTextNode = null;
  } else if (token.type === 'text') {

    if (currentTextNode === null){
      currentTextNode = {
        type: 'text',
        content: "",
      };
      top.children.push(currentTextNode);
    }
    currentTextNode.content += token.content;
  }
}

// <div/
const selfClosingStartTag = (c) => {
  if (c === '>') {
    currentToken.isSelfClosing = true;
    emit(currentToken);
    return data;
  } else if (c === EOF) {

  } else {

  }
}

const afterAttributeName = (c) => {
  if (c.match(/^[\t\n\f ]$/)) {
    return afterAttributeName;
  } else if (c === '/') {
    return selfClosingStartTag;
  } else if (c === '=') {
    return beforeAttributeValue;
  } else if (c === '>') {
    currentToken[currentAttribute.name] = currentAttribute.value;
    emit(currentToken);
    return data;
  } else if (c === EOF) {

  } else {
    //空字符走这里
    currentToken[currentAttribute.name] = currentAttribute.value;
    currentAttribute = {
      name: '',
      value: '',
    };
    return attributeName(c);
  }
}

const unquotedAttributeValue = (c) => {
  if (c.match(/^[\t\n\f ]$/)) {
    currentToken[currentAttribute.name] = currentAttribute.value;
    return beforeAttributeName;
  } else if (c === '/') {
    currentToken[currentAttribute.name] = currentAttribute.value;
    return selfClosingStartTag;
  } else if (c === '>') {
    currentToken[currentAttribute.name] = currentAttribute.value;
    emit(currentToken);
    return data;
  } else if (c === "\u0000") {

  } else if (c === '\"' || c === '\'' || c === '<' ||  c === '=' || c === '`') {

  } else if (c === EOF) {

  } else {
    currentAttribute.value += c;
    return unquotedAttributeValue;
  }
}

const afterQuotedAttributeValue = (c) => {
  if (c.match(/^[\t\n\f ]$/)) {
    return beforeAttributeName;
  } else if (c === '/') {
    return selfClosingStartTag;
  } else if (c === '>') {
    currentToken[currentAttribute.name] = currentAttribute.value;
    emit(currentToken);
    return data;
  } else if (c === EOF) {

  } else {
    // <a="a"x> 不合法
    // currentAttribute.value += c;
    // return 
  }
}

const singleQuotedAttributeValue = (c) => {
  if (c === '\'') {
    currentToken[currentAttribute.name] = currentAttribute.value;
    return afterQuotedAttributeValue;
  } else if (c === '\u0000') {
 
  } else if (c === EOF) {

  } else {
    currentAttribute.value += c;
    return singleQuotedAttributeValue;
  }
}

const doubleQuotedAttributeValue = (c) => {
  if (c === '\"') {
    currentToken[currentAttribute.name] = currentAttribute.value;
    return afterQuotedAttributeValue;
  } else if (c === '\u0000') {

  } else if (c === EOF) {

  } else {
    currentAttribute.value += c;
    return doubleQuotedAttributeValue;
  }
}

function beforeAttributeValue(c) {
  if (c.match(/^[\t\n\f ]$/) || c === '/' || c === '>' || c === EOF) {
    return beforeAttributeValue;
  } else if (c === '\"') {
    return doubleQuotedAttributeValue;
  } else if (c === '\'') {
    return singleQuotedAttributeValue;
  } else if (c === '>') {
    // return data
  } else {
    return unquotedAttributeValue(c);
  }
}

function attributeName(c) {
  if (c.match(/^[\t\n\f ]$/) || c === '/' || c === '>' || c === EOF) {
    return afterAttributeName(c);
  } else if (c === '=') {
    return beforeAttributeValue;
  } else if (c === '\u0000') {

  } else if (c === '\"' || c === '\'' || c === '<') {

  } else {
    currentAttribute.name += c;
    return attributeName;
  }
}

function beforeAttributeName(c) {
  if (c.match(/^[\t\n\f ]$/)) {
    return beforeAttributeName;
  } else if (c === '>' || c === '/' || c === EOF) {
    return afterAttributeName;
  } else if (c === '=') {

  } else {
    currentAttribute = {
      name: '',
      value: '',
    }
    return attributeName(c);
  }
}

const tagName = (c) => {
  if (c.match(/^[\t\n\f ]$/)) { //html有效4种空白符 tab 换行 禁止符 空格
    return beforeAttributeName;
  } else if (c === '/') {
    return selfClosingStartTag;
  } else if (c.match(/^[a-zA-Z]$/)) {
    currentToken.tagName += c; //.toLowerCase()
    return tagName;
  } else if (c === '>') {
    emit(currentToken);
    return data;
  } else {
    return tagName;
  }
}

const endTagOpen = (c) => {
  if (c.match(/^[a-zA-Z]$/)) {
    currentToken = {
      type: 'endTag',
      tagName: '',
    }
    return tagName(c);
  } else if (c === '>') { //tagOpen 紧跟> 报错 </>

  } else if (c === EOF) { //eof 报错

  } else {

  }
}


const tagOpen = (c) => {
  if (c === '/') {
    return endTagOpen;
  } else if (c.match(/^[a-zA-Z]$/)) { // 匹配返回数组 类似["c", index: 0, input: "c", groups: undefined] 不匹配返回null
    currentToken = {
      type: 'startTag',
      tagName: '',
    }
    return tagName(c);
  } else {
    return ;
  }
}

// 初始状态
function data(c) {
  if (c === '<') {
    return tagOpen;
  } else if (c === EOF) {
    emit({
      type: 'EOF',
    });
    return ;
  } else {
    emit({
      type: 'text',
      content: c,
    });
    return data;
  }
}

const parseHTML = (html) => {
  // console.log('----', html, data);
  let state = data;

  for (const c of html) {
    state = state(c);
  }

  state = state(EOF);
  // console.log(555, stack[0], 666, stack[0].children[0].children[1].children[5]);
  return stack[0];
}

module.exports.parseHTML = parseHTML;