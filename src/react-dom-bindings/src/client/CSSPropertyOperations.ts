import isAttributeNameSafe from "../shared/isAttributeNameSafe";
import isUnitlessNumber from "../shared/isUnitlessNumber";

const enableTrustedTypesIntegration = true

function setValueForStyle(style, styleName, value) {
  const isCustomProperty = styleName.indexOf('--') === 0;

  if (value == null || typeof value === 'boolean' || value === '') {
    if (isCustomProperty) {
      style.setProperty(styleName, '');
    } else if (styleName === 'float') {
      style.cssFloat = '';
    } else {
      style[styleName] = '';
    }
  } else if (isCustomProperty) {
    style.setProperty(styleName, value);
  } else if (
    typeof value === 'number' &&
    value !== 0 &&
    !isUnitlessNumber(styleName)
  ) {
    style[styleName] = value + 'px'; // Presumes implicit 'px' suffix for unitless numbers
  } else {
    if (styleName === 'float') {
      style.cssFloat = value;
    } else {
      style[styleName] = ('' + value).trim();
    }
  }
}

export function setValueForStyles(node, styles, prevStyles) {

  const style = node.style;

  if (prevStyles != null) {

    for (const styleName in prevStyles) {
      if (
        prevStyles.hasOwnProperty(styleName) &&
        (styles == null || !styles.hasOwnProperty(styleName))
      ) {
        // Clear style
        const isCustomProperty = styleName.indexOf('--') === 0;
        if (isCustomProperty) {
          style.setProperty(styleName, '');
        } else if (styleName === 'float') {
          style.cssFloat = '';
        } else {
          style[styleName] = '';
        }
      }
    }
    for (const styleName in styles) {
      const value = styles[styleName];
      if (styles.hasOwnProperty(styleName) && prevStyles[styleName] !== value) {
        setValueForStyle(style, styleName, value);
      }
    }
  } else {
    for (const styleName in styles) {
      if (styles.hasOwnProperty(styleName)) {
        const value = styles[styleName];
        setValueForStyle(style, styleName, value);
      }
    }
  }
}


export function setValueForKnownAttribute(
  node: Element,
  name: string,
  value,
) {
  if (value === null) {
    node.removeAttribute(name);
    return;
  }
  switch (typeof value) {
    case 'undefined':
    case 'function':
    case 'symbol':
    case 'boolean': {
      node.removeAttribute(name);
      return;
    }
  }
  node.setAttribute(
    name,
    enableTrustedTypesIntegration ? value : `${value}`,
  );
}


export function setValueForAttribute(
  node: Element,
  name: string,
  value,
) {
  if (isAttributeNameSafe(name)) {
    // If the prop isn't in the special list, treat it as a simple attribute.
    // shouldRemoveAttribute
    if (value === null) {
      node.removeAttribute(name);
      return;
    }
    switch (typeof value) {
      case 'undefined':
      case 'function':
      case 'symbol': // eslint-disable-line
        node.removeAttribute(name);
        return;
      case 'boolean': {
        const prefix = name.toLowerCase().slice(0, 5);
        if (prefix !== 'data-' && prefix !== 'aria-') {
          node.removeAttribute(name);
          return;
        }
      }
    }
    node.setAttribute(
      name,
      enableTrustedTypesIntegration ? value : `${value}`
    );
  }
}