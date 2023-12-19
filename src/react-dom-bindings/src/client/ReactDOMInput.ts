import { disableInputAttributeSyncing } from "shared/ReactFeatureFlags";
import {getToStringValue, toString} from './ToStringValue';


export function initInput(
  element: Element,
  value?: any,
  defaultValue?: any,
  checked?: boolean | null,
  defaultChecked?: boolean | null,
  type?: string | null,
  name?: string | null,
  isHydrating?: boolean | null,
) {
  const node: any = element;

  if (
    type != null &&
    typeof type !== 'function' &&
    typeof type !== 'symbol' &&
    typeof type !== 'boolean'
  ) {
    node.type = type;
  }

  if (value != null || defaultValue != null) {
    const isButton = type === 'submit' || type === 'reset';

    // Avoid setting value attribute on submit/reset inputs as it overrides the
    // default value provided by the browser. See: #12872
    if (isButton && (value === undefined || value === null)) {
      return;
    }

    const defaultValueStr =
      defaultValue != null ? toString(getToStringValue(defaultValue)) : '';
    const initialValue =
      value != null ? toString(getToStringValue(value)) : defaultValueStr;

    // Do not assign value if it is already set. This prevents user text input
    // from being lost during SSR hydration.
    if (!isHydrating) {
      if (disableInputAttributeSyncing) {
        // When not syncing the value attribute, the value property points
        // directly to the React prop. Only assign it if it exists.
        if (value != null) {
          // Always assign on buttons so that it is possible to assign an
          // empty string to clear button text.
          //
          // Otherwise, do not re-assign the value property if is empty. This
          // potentially avoids a DOM write and prevents Firefox (~60.0.1) from
          // prematurely marking required inputs as invalid. Equality is compared
          // to the current value in case the browser provided value is not an
          // empty string.
          if (isButton || toString(getToStringValue(value)) !== node.value) {
            node.value = toString(getToStringValue(value));
          }
        }
      } else {
        // When syncing the value attribute, the value property should use
        // the wrapperState._initialValue property. This uses:
        //
        //   1. The value React property when present
        //   2. The defaultValue React property when present
        //   3. An empty string
        if (initialValue !== node.value) {
          node.value = initialValue;
        }
      }
    }

    if (disableInputAttributeSyncing) {
      // When not syncing the value attribute, assign the value attribute
      // directly from the defaultValue React property (when present)
      if (defaultValue != null) {
        node.defaultValue = defaultValueStr;
      }
    } else {
      // Otherwise, the value attribute is synchronized to the property,
      // so we assign defaultValue to the same thing as the value property
      // assignment step above.
      node.defaultValue = initialValue;
    }
  }

  // Normally, we'd just do `node.checked = node.checked` upon initial mount, less this bug
  // this is needed to work around a chrome bug where setting defaultChecked
  // will sometimes influence the value of checked (even after detachment).
  // Reference: https://bugs.chromium.org/p/chromium/issues/detail?id=608416
  // We need to temporarily unset name to avoid disrupting radio button groups.

  const checkedOrDefault = checked != null ? checked : defaultChecked;
  // TODO: This 'function' or 'symbol' check isn't replicated in other places
  // so this semantic is inconsistent.
  const initialChecked =
    typeof checkedOrDefault !== 'function' &&
    typeof checkedOrDefault !== 'symbol' &&
    !!checkedOrDefault;

  if (isHydrating) {
    // Detach .checked from .defaultChecked but leave user input alone
    node.checked = node.checked;
  } else {
    node.checked = !!initialChecked;
  }

  if (disableInputAttributeSyncing) {
    // Only assign the checked attribute if it is defined. This saves
    // a DOM write when controlling the checked attribute isn't needed
    // (text inputs, submit/reset)
    if (defaultChecked != null) {
      node.defaultChecked = !node.defaultChecked;
      node.defaultChecked = !!defaultChecked;
    }
  } else {
    // When syncing the checked attribute, both the checked property and
    // attribute are assigned at the same time using defaultChecked. This uses:
    //
    //   1. The checked React property when present
    //   2. The defaultChecked React property when present
    //   3. Otherwise, false
    node.defaultChecked = !node.defaultChecked;
    node.defaultChecked = !!initialChecked;
  }

  // Name needs to be set at the end so that it applies atomically to connected radio buttons.
  if (
    name != null &&
    typeof name !== 'function' &&
    typeof name !== 'symbol' &&
    typeof name !== 'boolean'
  ) {
    node.name = name;
  }
}