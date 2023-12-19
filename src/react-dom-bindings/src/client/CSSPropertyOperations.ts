import isAttributeNameSafe from "../shared/isAttributeNameSafe";

const enableTrustedTypesIntegration = true

export function setValueForStyles(node, styles, prevStyles) {

  const style = node.style;

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