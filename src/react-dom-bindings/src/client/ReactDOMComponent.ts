import getAttributeAlias from "../shared/getAttributeAlias";
import { setValueForAttribute, setValueForKnownAttribute, setValueForStyles } from "./CSSPropertyOperations";
import { initInput } from "./ReactDOMInput";
import { updateTextarea } from "./ReactDOMTextarea";
import setTextContent from "./setTextContent";

const enableFilterEmptyStringAttributesDOM = true
const enableFormActions = true

function setProp(
  domElement: Element,
  tag: string,
  key: string,
  value,
  props: any,
  prevValue,
): void {
  switch (key) {
    case 'children': {
      if (typeof value === 'string') {
        // Avoid setting initial textContent when the text is empty. In IE11 setting
        // textContent on a <textarea> will cause the placeholder to not
        // show within the <textarea> until it has been focused and blurred again.
        // https://github.com/facebook/react/issues/6731#issuecomment-254874553
        const canSetTextContent =
          tag !== 'body' && (tag !== 'textarea' || value !== '');
        if (canSetTextContent) {
          setTextContent(domElement, value);
        }
      } else if (typeof value === 'number') {
        const canSetTextContent = tag !== 'body';
        if (canSetTextContent) {
          setTextContent(domElement, '' + value);
        }
      }
      break;
    }
    // These are very common props and therefore are in the beginning of the switch.
    // TODO: aria-label is a very common prop but allows booleans so is not like the others
    // but should ideally go in this list too.
    case 'className':
      setValueForKnownAttribute(domElement, 'class', value);
      break;
    case 'tabIndex':
      // This has to be case sensitive in SVG.
      setValueForKnownAttribute(domElement, 'tabindex', value);
      break;
    case 'dir':
    case 'role':
    case 'viewBox':
    case 'width':
    case 'height': {
      setValueForKnownAttribute(domElement, key, value);
      break;
    }
    case 'style': {
      setValueForStyles(domElement, value, prevValue);
      break;
    }
    // These attributes accept URLs. These must not allow javascript: URLS.
    case 'src':
    case 'href': {
      if (enableFilterEmptyStringAttributesDOM) {
        if (value === '') {
          domElement.removeAttribute(key);
          break;
        }
      }
      if (
        value == null ||
        typeof value === 'function' ||
        typeof value === 'symbol' ||
        typeof value === 'boolean'
      ) {
        domElement.removeAttribute(key);
        break;
      }
      // `setAttribute` with objects becomes only `[object]` in IE8/9,
      // ('' + value) makes it output the correct toString()-value.
      // const sanitizedValue = sanitizeURL(
      //   enableTrustedTypesIntegration ? value : '' + value,
      // );
      // domElement.setAttribute(key, sanitizedValue);
      break;
    }
    case 'action':
    case 'formAction': {
      // TODO: Consider moving these special cases to the form, input and button tags.
      if (enableFormActions) {
        if (typeof value === 'function') {
          // Set a javascript URL that doesn't do anything. We don't expect this to be invoked
          // because we'll preventDefault, but it can happen if a form is manually submitted or
          // if someone calls stopPropagation before React gets the event.
          // If CSP is used to block javascript: URLs that's fine too. It just won't show this
          // error message but the URL will be logged.
          domElement.setAttribute(
            key,
            // eslint-disable-next-line no-script-url
            "javascript:throw new Error('" +
            'A React form was unexpectedly submitted. If you called form.submit() manually, ' +
            "consider using form.requestSubmit() instead. If you\\'re trying to use " +
            'event.stopPropagation() in a submit event handler, consider also calling ' +
            'event.preventDefault().' +
            "')",
          );
          break;
        } else if (typeof prevValue === 'function') {
          // When we're switching off a Server Action that was originally hydrated.
          // The server control these fields during SSR that are now trailing.
          // The regular diffing doesn't apply since we compare against the previous props.
          // Instead, we need to force them to be set to whatever they should be now.
          // This would be a lot cleaner if we did this whole fork in the per-tag approach.
          if (key === 'formAction') {
            if (tag !== 'input') {
              // Setting the name here isn't completely safe for inputs if this is switching
              // to become a radio button. In that case we let the tag based override take
              // control.
              setProp(domElement, tag, 'name', props.name, props, null);
            }
            setProp(
              domElement,
              tag,
              'formEncType',
              props.formEncType,
              props,
              null,
            );
            setProp(
              domElement,
              tag,
              'formMethod',
              props.formMethod,
              props,
              null,
            );
            setProp(
              domElement,
              tag,
              'formTarget',
              props.formTarget,
              props,
              null,
            );
          } else {
            setProp(domElement, tag, 'encType', props.encType, props, null);
            setProp(domElement, tag, 'method', props.method, props, null);
            setProp(domElement, tag, 'target', props.target, props, null);
          }
        }
      }
      if (
        value == null ||
        (!enableFormActions && typeof value === 'function') ||
        typeof value === 'symbol' ||
        typeof value === 'boolean'
      ) {
        domElement.removeAttribute(key);
        break;
      }
      // `setAttribute` with objects becomes only `[object]` in IE8/9,
      // ('' + value) makes it output the correct toString()-value.
      // const sanitizedValue = (sanitizeURL(
      //   enableTrustedTypesIntegration ? value : '' + (value: any),
      // ): any);
      // domElement.setAttribute(key, sanitizedValue);
      break;
    }
    case 'onClick': {
      // TODO: This cast may not be sound for SVG, MathML or custom elements.
      if (value != null) {
        // trapClickOnNonInteractiveElement(((domElement: any): HTMLElement));
      }
      break;
    }
    case 'onScroll': {
      if (value != null) {
        // listenToNonDelegatedEvent('scroll', domElement);
      }
      break;
    }
    case 'onScrollEnd': {
      if (value != null) {
        // listenToNonDelegatedEvent('scrollend', domElement);
      }
      break;
    }
    case 'dangerouslySetInnerHTML': {
      if (value != null) {
        if (typeof value !== 'object' || !('__html' in value)) {
          throw new Error(
            '`props.dangerouslySetInnerHTML` must be in the form `{__html: ...}`. ' +
            'Please visit https://reactjs.org/link/dangerously-set-inner-html ' +
            'for more information.',
          );
        }
        const nextHtml: any = value.__html;
        if (nextHtml != null) {
          if (props.children != null) {
            throw new Error(
              'Can only set one of `children` or `props.dangerouslySetInnerHTML`.',
            );
          }
          // if (disableIEWorkarounds) {
          domElement.innerHTML = nextHtml;
          // } else {
          // setInnerHTML(domElement, nextHtml);
          // }
        }
      }
      break;
    }
    // Note: `option.selected` is not updated if `select.multiple` is
    // disabled with `removeAttribute`. We have special logic for handling this.
    case 'multiple': {
      domElement && ((domElement as any).multiple =
        value && typeof value !== 'function' && typeof value !== 'symbol');
      break;
    }
    case 'muted': {
      (domElement as any).muted =
        value && typeof value !== 'function' && typeof value !== 'symbol';
      break;
    }
    case 'suppressContentEditableWarning':
    case 'suppressHydrationWarning':
    case 'defaultValue': // Reserved
    case 'defaultChecked':
    case 'innerHTML': {
      // Noop
      break;
    }
    case 'autoFocus': {
      // We polyfill it separately on the client during commit.
      // We could have excluded it in the property list instead of
      // adding a special case here, but then it wouldn't be emitted
      // on server rendering (but we *do* want to emit it in SSR).
      break;
    }
    case 'xlinkHref': {
      if (
        value == null ||
        typeof value === 'function' ||
        typeof value === 'boolean' ||
        typeof value === 'symbol'
      ) {
        domElement.removeAttribute('xlink:href');
        break;
      }
      // `setAttribute` with objects becomes only `[object]` in IE8/9,
      // ('' + value) makes it output the correct toString()-value.
      // const sanitizedValue = (sanitizeURL(
      //   enableTrustedTypesIntegration ? value : '' + (value: any),
      // ): any);
      // domElement.setAttributeNS(xlinkNamespace, 'xlink:href', sanitizedValue);
      break;
    }
    case 'contentEditable':
    case 'spellCheck':
    case 'draggable':
    case 'value':
    case 'autoReverse':
    case 'externalResourcesRequired':
    case 'focusable':
    case 'preserveAlpha': {
      // Booleanish String
      // These are "enumerated" attributes that accept "true" and "false".
      // In React, we let users pass `true` and `false` even though technically
      // these aren't boolean attributes (they are coerced to strings).
      // The SVG attributes are case-sensitive. Since the HTML attributes are
      // insensitive they also work even though we canonically use lower case.
      if (
        value != null &&
        typeof value !== 'function' &&
        typeof value !== 'symbol'
      ) {
        // domElement.setAttribute(
        //   key,
        //   enableTrustedTypesIntegration ? (value: any) : '' + (value: any),
        // );
      } else {
        domElement.removeAttribute(key);
      }
      break;
    }
    // Boolean
    case 'allowFullScreen':
    case 'async':
    case 'autoPlay':
    case 'controls':
    case 'default':
    case 'defer':
    case 'disabled':
    case 'disablePictureInPicture':
    case 'disableRemotePlayback':
    case 'formNoValidate':
    case 'hidden':
    case 'loop':
    case 'noModule':
    case 'noValidate':
    case 'open':
    case 'playsInline':
    case 'readOnly':
    case 'required':
    case 'reversed':
    case 'scoped':
    case 'seamless':
    case 'itemScope': {
      if (value && typeof value !== 'function' && typeof value !== 'symbol') {
        domElement.setAttribute(key, '');
      } else {
        domElement.removeAttribute(key);
      }
      break;
    }
    // Overloaded Boolean
    case 'capture':
    case 'download': {
      // An attribute that can be used as a flag as well as with a value.
      // When true, it should be present (set either to an empty string or its name).
      // When false, it should be omitted.
      // For any other value, should be present with that value.
      if (value === true) {
        domElement.setAttribute(key, '');
      } else if (
        value !== false &&
        value != null &&
        typeof value !== 'function' &&
        typeof value !== 'symbol'
      ) {
        domElement.setAttribute(key, value);
      } else {
        domElement.removeAttribute(key);
      }
      break;
    }
    case 'cols':
    case 'rows':
    case 'size':
    case 'span': {
      // These are HTML attributes that must be positive numbers.
      if (
        value != null &&
        typeof value !== 'function' &&
        typeof value !== 'symbol' &&
        !isNaN(value) &&
        (value as any) >= 1
      ) {
        domElement.setAttribute(key, (value as any));
      } else {
        domElement.removeAttribute(key);
      }
      break;
    }
    case 'rowSpan':
    case 'start': {
      // These are HTML attributes that must be numbers.
      if (
        value != null &&
        typeof value !== 'function' &&
        typeof value !== 'symbol' &&
        !isNaN(value)
      ) {
        domElement.setAttribute(key, (value as any));
      } else {
        domElement.removeAttribute(key);
      }
      break;
    }
    case 'xlinkActuate':
      // setValueForNamespacedAttribute(
      //   domElement,
      //   xlinkNamespace,
      //   'xlink:actuate',
      //   value,
      // );
      break;
    case 'xlinkArcrole':
      // setValueForNamespacedAttribute(
      //   domElement,
      //   xlinkNamespace,
      //   'xlink:arcrole',
      //   value,
      // );
      break;
    case 'xlinkRole':
      // setValueForNamespacedAttribute(
      //   domElement,
      //   xlinkNamespace,
      //   'xlink:role',
      //   value,
      // );
      break;
    case 'xlinkShow':
      // setValueForNamespacedAttribute(
      //   domElement,
      //   xlinkNamespace,
      //   'xlink:show',
      //   value,
      // );
      break;
    // case 'xlinkTitle':
    //   setValueForNamespacedAttribute(
    //     domElement,
    //     xlinkNamespace,
    //     'xlink:title',
    //     value,
    //   );
    //   break;
    // case 'xlinkType':
    //   setValueForNamespacedAttribute(
    //     domElement,
    //     xlinkNamespace,
    //     'xlink:type',
    //     value,
    //   );
    //   break;
    // case 'xmlBase':
    //   setValueForNamespacedAttribute(
    //     domElement,
    //     xmlNamespace,
    //     'xml:base',
    //     value,
    //   );
    //   break;
    // case 'xmlLang':
    //   setValueForNamespacedAttribute(
    //     domElement,
    //     xmlNamespace,
    //     'xml:lang',
    //     value,
    //   );
    //   break;
    // case 'xmlSpace':
    //   setValueForNamespacedAttribute(
    //     domElement,
    //     xmlNamespace,
    //     'xml:space',
    //     value,
    //   );
    //   break;
    // // Properties that should not be allowed on custom elements.
    // case 'is': {
    //   // TODO: We shouldn't actually set this attribute, because we've already
    //   // passed it to createElement. We don't also need the attribute.
    //   // However, our tests currently query for it so it's plausible someone
    //   // else does too so it's break.
    //   setValueForAttribute(domElement, 'is', value);
    //   break;
    // }
    // case 'innerText':
    // case 'textContent':
    //   if (enableCustomElementPropertySupport) {
    //     break;
    //   }
    // Fall through
    default: {
      if (
        key.length > 2 &&
        (key[0] === 'o' || key[0] === 'O') &&
        (key[1] === 'n' || key[1] === 'N')
      ) {
        const attributeName = getAttributeAlias(key);
        setValueForAttribute(domElement, attributeName, value);
      }
      // TODO：临时解决方案处理input元素placeholder属性赋值
      if (key === 'placeholder') {
        domElement.setAttribute(
          key,
          value
        );
      }
    }
  }
}

export function setInitialDOMProperties(domElement, tag, props) {

  // TODO: Make sure that we check isMounted before firing any of these events.

  switch (tag) {
    case 'div':
    case 'span':
    case 'svg':
    case 'path':
    case 'a':
    case 'g':
    case 'p':
    case 'li': {
      // Fast track the most common tag types
      break;
    }
    case 'input': {
      // We listen to this event in case to ensure emulated bubble
      // listeners still fire for the invalid event.

      let name = null;
      let type = null;
      let value = null;
      let defaultValue = null;
      let checked = null;
      let defaultChecked = null;
      for (const propKey in props) {
        if (!props.hasOwnProperty(propKey)) {
          continue;
        }
        const propValue = props[propKey];
        if (propValue == null) {
          continue;
        }
        switch (propKey) {
          case 'name': {
            name = propValue;
            break;
          }
          case 'type': {
            type = propValue;
            break;
          }
          case 'checked': {
            checked = propValue;
            break;
          }
          case 'defaultChecked': {
            defaultChecked = propValue;
            break;
          }
          case 'value': {
            value = propValue;
            break;
          }
          case 'defaultValue': {
            defaultValue = propValue;
            break;
          }
          case 'children':
          case 'dangerouslySetInnerHTML': {
            if (propValue != null) {
              throw new Error(
                `${tag} is a void element tag and must neither have \`children\` nor ` +
                'use `dangerouslySetInnerHTML`.',
              );
            }
            break;
          }
          default: {
            setProp(domElement, tag, propKey, propValue, props, null);
          }
        }
      }
      // TODO: Make sure we check if this is still unmounted or do any clean
      // up necessary since we never stop tracking anymore.
      initInput(
        domElement,
        value,
        defaultValue,
        checked,
        defaultChecked,
        type,
        name,
        false,
      );
      return;
    }
    case 'select': {
      let value = null;
      let defaultValue = null;
      let multiple = null;
      for (const propKey in props) {
        if (!props.hasOwnProperty(propKey)) {
          continue;
        }
        const propValue = props[propKey];
        if (propValue == null) {
          continue;
        }
        switch (propKey) {
          case 'value': {
            value = propValue;
            // This is handled by initSelect below.
            break;
          }
          case 'defaultValue': {
            defaultValue = propValue;
            // This is handled by initSelect below.
            break;
          }
          case 'multiple': {
            multiple = propValue;
            // TODO: We don't actually have to fall through here because we set it
            // in initSelect anyway. We can remove the special case in setProp.
          }
          // Fallthrough
          default: {
            setProp(domElement, tag, propKey, propValue, props, null);
          }
        }
      }
      // validateSelectProps(domElement, props);
      // initSelect(domElement, value, defaultValue, multiple);
      return;
    }
    case 'textarea': {
      // We listen to this event in case to ensure emulated bubble
      // listeners still fire for the invalid event.
      let value = null;
      let defaultValue = null;
      let children = null;
      for (const propKey in props) {
        if (!props.hasOwnProperty(propKey)) {
          continue;
        }
        const propValue = props[propKey];
        if (propValue == null) {
          continue;
        }
        switch (propKey) {
          case 'value': {
            value = propValue;
            // This is handled by initTextarea below.
            break;
          }
          case 'defaultValue': {
            defaultValue = propValue;
            break;
          }
          case 'children': {
            children = propValue;
            // Handled by initTextarea above.
            break;
          }
          case 'dangerouslySetInnerHTML': {
            if (propValue != null) {
              // TODO: Do we really need a special error message for this. It's also pretty blunt.
              throw new Error(
                '`dangerouslySetInnerHTML` does not make sense on <textarea>.',
              );
            }
            break;
          }
          default: {
            setProp(domElement, tag, propKey, propValue, props, null);
          }
        }
      }
      // TODO: Make sure we check if this is still unmounted or do any clean
      // up necessary since we never stop tracking anymore.
      // initTextarea(domElement, value, defaultValue, children);
      return;
    }
    default: {
      // if (isCustomElement(tag, props)) {
      //   for (const propKey in props) {
      //     if (!props.hasOwnProperty(propKey)) {
      //       continue;
      //     }
      //     const propValue = props[propKey];
      //     if (propValue == null) {
      //       continue;
      //     }
      //     setPropOnCustomElement(
      //       domElement,
      //       tag,
      //       propKey,
      //       propValue,
      //       props,
      //       null,
      //     );
      //   }
      //   return;
      // }
    }
  }

  for (const propKey in props) {
    if (!props.hasOwnProperty(propKey)) {
      continue;
    }
    const propValue = props[propKey];
    if (propValue == null) {
      continue;
    }
    setProp(domElement, tag, propKey, propValue, props, null);
  }
}

export function setInitialProperties(domElement, type, props) {
  setInitialDOMProperties(domElement, type, props)
}

export function diffProperties(
  updatePayload: null | Object,
  prevProps: Object,
  nextProps: Object,
) {
  let attributeConfig;
  let nextProp;
  let prevProp;

  for (const propKey in nextProps) {

    prevProp = prevProps[propKey];
    nextProp = nextProps[propKey];

    // functions are converted to booleans as markers that the associated
    // events should be sent from native.
    if (typeof nextProp === 'function') {
      nextProp = true;
      // If nextProp is not a function, then don't bother changing prevProp
      // since nextProp will win and go into the updatePayload regardless.
      if (typeof prevProp === 'function') {
        prevProp = true;
      }
    }

    // An explicit value of undefined is treated as a null because it overrides
    // any other preceding value.
    if (typeof nextProp === 'undefined') {
      nextProp = null;
      if (typeof prevProp === 'undefined') {
        prevProp = null;
      }
    }

    if (updatePayload && updatePayload[propKey] !== undefined) {
      // Something else already triggered an update to this key because another
      // value diffed. Since we're now later in the nested arrays our value is
      // more important so we need to calculate it and override the existing
      // value. It doesn't matter if nothing changed, we'll set it anyway.

      // Pattern match on: attributeConfig
      if (typeof attributeConfig !== 'object') {
        // case: !Object is the default case
        updatePayload[propKey] = nextProp;
      } else if (
        typeof attributeConfig.diff === 'function' ||
        typeof attributeConfig.process === 'function'
      ) {
        // case: CustomAttributeConfiguration
        const nextValue =
          typeof attributeConfig.process === 'function'
            ? attributeConfig.process(nextProp)
            : nextProp;
        updatePayload[propKey] = nextValue;
      }
      continue;
    }

    if (prevProp === nextProp) {
      continue; // nothing changed
    }

    // Pattern match on: attributeConfig
    if (typeof attributeConfig !== 'object') {
      // case: !Object is the default case
      // if (defaultDiffer(prevProp, nextProp)) {
      //   // a normal leaf has changed
      //   (updatePayload || (updatePayload = ({}: {[string]: $FlowFixMe})))[
      //     propKey
      //   ] = nextProp;
      // }
    } else if (
      typeof attributeConfig.diff === 'function' ||
      typeof attributeConfig.process === 'function'
    ) {
      // case: CustomAttributeConfiguration
      const shouldUpdate =
        prevProp === undefined ||
        (typeof attributeConfig.diff === 'function'
          ? attributeConfig.diff(prevProp, nextProp)
          : true) // defaultDiffer(prevProp, nextProp));
      if (shouldUpdate) {
        const nextValue =
          typeof attributeConfig.process === 'function'
            ? // $FlowFixMe[incompatible-use] found when upgrading Flow
            attributeConfig.process(nextProp)
            : nextProp;
        (updatePayload || (updatePayload = {}))[
          propKey
        ] = nextValue;
      }
    } else {
    }
  }
}


export function updateProperties(
  domElement: Element,
  tag: string,
  lastProps: Object,
  nextProps: Object,
): void {

  switch (tag) {
    case 'div':
    case 'span':
    case 'svg':
    case 'path':
    case 'a':
    case 'g':
    case 'p':
    case 'li': {
      // Fast track the most common tag types
      break;
    }
    case 'input': {
      let name = null;
      let type = null;
      let value = null;
      let defaultValue = null;
      let lastDefaultValue = null;
      let checked = null;
      let defaultChecked = null;
      for (const propKey in lastProps) {
        const lastProp = lastProps[propKey];
        if (lastProps.hasOwnProperty(propKey) && lastProp != null) {
          switch (propKey) {
            case 'checked': {
              break;
            }
            case 'value': {
              // This is handled by updateWrapper below.
              break;
            }
            case 'defaultValue': {
              lastDefaultValue = lastProp;
            }
            // defaultChecked and defaultValue are ignored by setProp
            // Fallthrough
            default: {
              if (!nextProps.hasOwnProperty(propKey))
                setProp(domElement, tag, propKey, null, nextProps, lastProp);
            }
          }
        }
      }
      for (const propKey in nextProps) {
        const nextProp = nextProps[propKey];
        const lastProp = lastProps[propKey];
        if (
          nextProps.hasOwnProperty(propKey) &&
          (nextProp != null || lastProp != null)
        ) {
          switch (propKey) {
            case 'type': {
              type = nextProp;
              break;
            }
            case 'name': {
              name = nextProp;
              break;
            }
            case 'checked': {
              checked = nextProp;
              break;
            }
            case 'defaultChecked': {
              defaultChecked = nextProp;
              break;
            }
            case 'value': {
              value = nextProp;
              break;
            }
            case 'defaultValue': {
              defaultValue = nextProp;
              break;
            }
            case 'children':
            case 'dangerouslySetInnerHTML': {
              if (nextProp != null) {
                throw new Error(
                  `${tag} is a void element tag and must neither have \`children\` nor ` +
                  'use `dangerouslySetInnerHTML`.',
                );
              }
              break;
            }
            default: {
              if (nextProp !== lastProp)
                setProp(
                  domElement,
                  tag,
                  propKey,
                  nextProp,
                  nextProps,
                  lastProp,
                );
            }
          }
        }
      }

      // Update the wrapper around inputs *after* updating props. This has to
      // happen after updating the rest of props. Otherwise HTML5 input validations
      // raise warnings and prevent the new value from being assigned.
      // TODO: console.error('unpdateInput未实现')
      // updateInput(
      //   domElement,
      //   value,
      //   defaultValue,
      //   lastDefaultValue,
      //   checked,
      //   defaultChecked,
      //   type,
      //   name,
      // );
      return;
    }
    case 'select': {
      let value = null;
      let defaultValue = null;
      let multiple = null;
      let wasMultiple = null;
      for (const propKey in lastProps) {
        const lastProp = lastProps[propKey];
        if (lastProps.hasOwnProperty(propKey) && lastProp != null) {
          switch (propKey) {
            case 'value': {
              // This is handled by updateWrapper below.
              break;
            }
            // defaultValue are ignored by setProp
            case 'multiple': {
              wasMultiple = lastProp;
              // TODO: Move special case in here from setProp.
            }
            // Fallthrough
            default: {
              if (!nextProps.hasOwnProperty(propKey))
                setProp(domElement, tag, propKey, null, nextProps, lastProp);
            }
          }
        }
      }
      for (const propKey in nextProps) {
        const nextProp = nextProps[propKey];
        const lastProp = lastProps[propKey];
        if (
          nextProps.hasOwnProperty(propKey) &&
          (nextProp != null || lastProp != null)
        ) {
          switch (propKey) {
            case 'value': {
              value = nextProp;
              // This is handled by updateSelect below.
              break;
            }
            case 'defaultValue': {
              defaultValue = nextProp;
              break;
            }
            case 'multiple': {
              multiple = nextProp;
              // TODO: Just move the special case in here from setProp.
            }
            // Fallthrough
            default: {
              if (nextProp !== lastProp)
                setProp(
                  domElement,
                  tag,
                  propKey,
                  nextProp,
                  nextProps,
                  lastProp,
                );
            }
          }
        }
      }
      // <select> value update needs to occur after <option> children
      // reconciliation
      // updateSelect(domElement, value, defaultValue, multiple, wasMultiple);
      return;
    }
    case 'textarea': {
      let value: any = null;
      let defaultValue: any = null;
      for (const propKey in lastProps) {
        const lastProp = lastProps[propKey];
        if (
          lastProps.hasOwnProperty(propKey) &&
          lastProp != null &&
          !nextProps.hasOwnProperty(propKey)
        ) {
          switch (propKey) {
            case 'value': {
              // This is handled by updateTextarea below.
              break;
            }
            case 'children': {
              // TODO: This doesn't actually do anything if it updates.
              break;
            }
            // defaultValue is ignored by setProp
            default: {
              setProp(domElement, tag, propKey, null, nextProps, lastProp);
            }
          }
        }
      }
      for (const propKey in nextProps) {
        const nextProp = nextProps[propKey];
        const lastProp = lastProps[propKey];
        if (
          nextProps.hasOwnProperty(propKey) &&
          (nextProp != null || lastProp != null)
        ) {
          switch (propKey) {
            case 'value': {
              value = nextProp;
              // This is handled by updateTextarea below.
              break;
            }
            case 'defaultValue': {
              defaultValue = nextProp;
              break;
            }
            case 'children': {
              // TODO: This doesn't actually do anything if it updates.
              break;
            }
            case 'dangerouslySetInnerHTML': {
              if (nextProp != null) {
                // TODO: Do we really need a special error message for this. It's also pretty blunt.
                throw new Error(
                  '`dangerouslySetInnerHTML` does not make sense on <textarea>.',
                );
              }
              break;
            }
            default: {
              if (nextProp !== lastProp)
                setProp(
                  domElement,
                  tag,
                  propKey,
                  nextProp,
                  nextProps,
                  lastProp,
                );
            }
          }
        }
      }
      updateTextarea(domElement, value, defaultValue);
      return;
    }
    case 'option': {
      for (const propKey in lastProps) {
        const lastProp = lastProps[propKey];
        if (
          lastProps.hasOwnProperty(propKey) &&
          lastProp != null &&
          !nextProps.hasOwnProperty(propKey)
        ) {
          switch (propKey) {
            case 'selected': {
              // TODO: Remove support for selected on option.
              (domElement as any).selected = false;
              break;
            }
            default: {
              setProp(domElement, tag, propKey, null, nextProps, lastProp);
            }
          }
        }
      }
      for (const propKey in nextProps) {
        const nextProp = nextProps[propKey];
        const lastProp = lastProps[propKey];
        if (
          nextProps.hasOwnProperty(propKey) &&
          nextProp !== lastProp &&
          (nextProp != null || lastProp != null)
        ) {
          switch (propKey) {
            case 'selected': {
              // TODO: Remove support for selected on option.
              (domElement as any).selected =
                nextProp &&
                typeof nextProp !== 'function' &&
                typeof nextProp !== 'symbol';
              break;
            }
            default: {
              setProp(domElement, tag, propKey, nextProp, nextProps, lastProp);
            }
          }
        }
      }
      return;
    }
    case 'img':
    case 'link':
    case 'area':
    case 'base':
    case 'br':
    case 'col':
    case 'embed':
    case 'hr':
    case 'keygen':
    case 'meta':
    case 'param':
    case 'source':
    case 'track':
    case 'wbr':
    case 'menuitem': {
      // Void elements
      for (const propKey in lastProps) {
        const lastProp = lastProps[propKey];
        if (
          lastProps.hasOwnProperty(propKey) &&
          lastProp != null &&
          !nextProps.hasOwnProperty(propKey)
        ) {
          setProp(domElement, tag, propKey, null, nextProps, lastProp);
        }
      }
      for (const propKey in nextProps) {
        const nextProp = nextProps[propKey];
        const lastProp = lastProps[propKey];
        if (
          nextProps.hasOwnProperty(propKey) &&
          nextProp !== lastProp &&
          (nextProp != null || lastProp != null)
        ) {
          switch (propKey) {
            case 'children':
            case 'dangerouslySetInnerHTML': {
              if (nextProp != null) {
                // TODO: Can we make this a DEV warning to avoid this deny list?
                throw new Error(
                  `${tag} is a void element tag and must neither have \`children\` nor ` +
                  'use `dangerouslySetInnerHTML`.',
                );
              }
              break;
            }
            // defaultChecked and defaultValue are ignored by setProp
            default: {
              setProp(domElement, tag, propKey, nextProp, nextProps, lastProp);
            }
          }
        }
      }
      return;
    }
    default: {
      // if (isCustomElement(tag, nextProps)) {
      //   for (const propKey in lastProps) {
      //     const lastProp = lastProps[propKey];
      //     if (
      //       lastProps.hasOwnProperty(propKey) &&
      //       lastProp != null &&
      //       !nextProps.hasOwnProperty(propKey)
      //     ) {
      //       setPropOnCustomElement(
      //         domElement,
      //         tag,
      //         propKey,
      //         null,
      //         nextProps,
      //         lastProp,
      //       );
      //     }
      //   }
      //   for (const propKey in nextProps) {
      //     const nextProp = nextProps[propKey];
      //     const lastProp = lastProps[propKey];
      //     if (
      //       nextProps.hasOwnProperty(propKey) &&
      //       nextProp !== lastProp &&
      //       (nextProp != null || lastProp != null)
      //     ) {
      //       setPropOnCustomElement(
      //         domElement,
      //         tag,
      //         propKey,
      //         nextProp,
      //         nextProps,
      //         lastProp,
      //       );
      //     }
      //   }
      return;
    }
  }

  for (const propKey in lastProps) {
    const lastProp = lastProps[propKey];
    if (
      lastProps.hasOwnProperty(propKey) &&
      lastProp != null &&
      !nextProps.hasOwnProperty(propKey)
    ) {
      setProp(domElement, tag, propKey, null, nextProps, lastProp);
    }
  }
  for (const propKey in nextProps) {
    const nextProp = nextProps[propKey];
    const lastProp = lastProps[propKey];
    if (
      nextProps.hasOwnProperty(propKey) &&
      nextProp !== lastProp &&
      (nextProp != null || lastProp != null)
    ) {
      setProp(domElement, tag, propKey, nextProp, nextProps, lastProp);
    }
  }
}