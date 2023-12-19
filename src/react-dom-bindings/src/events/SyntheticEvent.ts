import { Fiber } from "react-reconciler/src/ReactInternalTypes";
import assign from "shared/assign";

type EventInterfaceType = {
  [propName: string]: 0 | ((event: { [propName: string]: any }) => any),
};

function functionThatReturnsTrue() {
  return true;
}

function functionThatReturnsFalse() {
  return false;
}

function createSyntheticEvent(Interface: any) {
  function SyntheticBaseEvent(this: any,
    reactName: string | null,
    reactEventType: string,
    targetInst: Fiber | null,
    nativeEvent: { [propName: string]: any },
    nativeEventTarget: null | EventTarget,
  ) {
    this._reactName = reactName;
    this._targetInst = targetInst;
    this.type = reactEventType;
    this.nativeEvent = nativeEvent;
    this.target = nativeEventTarget;
    this.currentTarget = null;

    for (const propName in Interface) {
      if (!Interface.hasOwnProperty(propName)) {
        continue;
      }
      const normalize = Interface[propName];
      if (normalize) {
        this[propName] = normalize(nativeEvent);
      } else {
        this[propName] = nativeEvent[propName];
      }
    }

    const defaultPrevented =
      nativeEvent.defaultPrevented != null
        ? nativeEvent.defaultPrevented
        : nativeEvent.returnValue === false;
    if (defaultPrevented) {
      this.isDefaultPrevented = functionThatReturnsTrue;
    } else {
      this.isDefaultPrevented = functionThatReturnsFalse;
    }
    this.isPropagationStopped = functionThatReturnsFalse;
    return this;
  }

  assign(SyntheticBaseEvent.prototype, {
    preventDefault: function () {
      (this as any).defaultPrevented = true;
      const event = (this as any).nativeEvent;
      if (!event) {
        return;
      }

      if (event.preventDefault) {
        event.preventDefault();
      } else if (event.returnValue !== 'unknown') {
        event.returnValue = false;
      }
      (this as any).isDefaultPrevented = functionThatReturnsTrue;
    },

    stopPropagation: function () {
      const event = (this as any).nativeEvent;
      if (!event) {
        return;
      }
      if (event.stopPropagation) {
        event.stopPropagation();
      } else if (event.cancelBubble !== 'unknown') {
        event.cancelBubble = true;
      }

      (this as any).isPropagationStopped = functionThatReturnsTrue;
    },

  });
  return SyntheticBaseEvent;
}

const MouseEventInterface: EventInterfaceType = {
  screenX: 0,
  screenY: 0,
  clientX: 0,
  clientY: 0,
  pageX: 0,
  pageY: 0,
  ctrlKey: 0,
  shiftKey: 0,
};
export const SyntheticMouseEvent =
  createSyntheticEvent(MouseEventInterface);


const EventInterface = {
  eventPhase: 0,
  bubbles: 0,
  cancelable: 0,
  timeStamp: function (event: { [propName: string]: any }) {
    return event.timeStamp || Date.now();
  },
  defaultPrevented: 0,
  isTrusted: 0,
};

const UIEventInterface: any = {
  ...EventInterface,
  view: 0,
  detail: 0,
};

export const SyntheticEvent = createSyntheticEvent(EventInterface);

const KeyboardEventInterface = {
  ...UIEventInterface,
  // key: getEventKey,
  code: 0,
  location: 0,
  ctrlKey: 0,
  shiftKey: 0,
  altKey: 0,
  metaKey: 0,
  repeat: 0,
  locale: 0,
  // getModifierState: getEventModifierState,
  // Legacy Interface
  charCode: function (event: { [propName: string]: any }) {
    // `charCode` is the result of a KeyPress event and represents the value of
    // the actual printable character.

    // KeyPress is deprecated, but its replacement is not yet final and not
    // implemented in any major browser. Only KeyPress has charCode.
    if (event.type === 'keypress') {
      // return getEventCharCode(
      //   // $FlowFixMe[incompatible-call] unable to narrow to `KeyboardEvent`
      //   event,
      // );
    }
    return 0;
  },
  keyCode: function (event: { [propName: string]: any }) {
    // `keyCode` is the result of a KeyDown/Up event and represents the value of
    // physical keyboard key.

    // The actual meaning of the value depends on the users' keyboard layout
    // which cannot be detected. Assuming that it is a US keyboard layout
    // provides a surprisingly accurate mapping for US and European users.
    // Due to this, it is left to the user to implement at this time.
    if (event.type === 'keydown' || event.type === 'keyup') {
      return event.keyCode;
    }
    return 0;
  },
  which: function (event: { [propName: string]: any }) {
    // `which` is an alias for either `keyCode` or `charCode` depending on the
    // type of the event.
    if (event.type === 'keypress') {
      // return getEventCharCode(
      //   // $FlowFixMe[incompatible-call] unable to narrow to `KeyboardEvent`
      //   event,
      // );
    }
    if (event.type === 'keydown' || event.type === 'keyup') {
      return event.keyCode;
    }
    return 0;
  },
};
export const SyntheticKeyboardEvent = createSyntheticEvent(
  KeyboardEventInterface,
);

/**
 * @interface PointerEvent
 * @see http://www.w3.org/TR/pointerevents/
 */
const PointerEventInterface = {
  ...MouseEventInterface,
  pointerId: 0,
  width: 0,
  height: 0,
  pressure: 0,
  tangentialPressure: 0,
  tiltX: 0,
  tiltY: 0,
  twist: 0,
  pointerType: 0,
  isPrimary: 0,
};
export const SyntheticPointerEvent = createSyntheticEvent(
  PointerEventInterface,
);

/**
 * @interface TouchEvent
 * @see http://www.w3.org/TR/touch-events/
 */
const TouchEventInterface = {
  ...UIEventInterface,
  touches: 0,
  targetTouches: 0,
  changedTouches: 0,
  altKey: 0,
  metaKey: 0,
  ctrlKey: 0,
  shiftKey: 0,
  // getModifierState: getEventModifierState,
};
export const SyntheticTouchEvent =
  createSyntheticEvent(TouchEventInterface);

/**
 * @interface Event
 * @see http://www.w3.org/TR/2009/WD-css3-transitions-20090320/#transition-events-
 * @see https://developer.mozilla.org/en-US/docs/Web/API/TransitionEvent
 */
const TransitionEventInterface = {
  ...EventInterface,
  propertyName: 0,
  elapsedTime: 0,
  pseudoElement: 0,
};
export const SyntheticTransitionEvent = createSyntheticEvent(
  TransitionEventInterface,
);

/**
 * @interface WheelEvent
 * @see http://www.w3.org/TR/DOM-Level-3-Events/
 */
const WheelEventInterface = {
  ...MouseEventInterface,
  deltaX(event: { [propName: string]: any }) {
    return 'deltaX' in event
      ? event.deltaX
      : // Fallback to `wheelDeltaX` for Webkit and normalize (right is positive).
      'wheelDeltaX' in event
        ? // $FlowFixMe[unsafe-arithmetic] assuming this is a number
        -event.wheelDeltaX
        : 0;
  },
  deltaY(event: { [propName: string]: any }) {
    return 'deltaY' in event
      ? event.deltaY
      : // Fallback to `wheelDeltaY` for Webkit and normalize (down is positive).
      'wheelDeltaY' in event
        ? // $FlowFixMe[unsafe-arithmetic] assuming this is a number
        -event.wheelDeltaY
        : // Fallback to `wheelDelta` for IE<9 and normalize (down is positive).
        'wheelDelta' in event
          ? // $FlowFixMe[unsafe-arithmetic] assuming this is a number
          -event.wheelDelta
          : 0;
  },
  deltaZ: 0,

  // Browsers without "deltaMode" is reporting in raw wheel delta where one
  // notch on the scroll is always +/- 120, roughly equivalent to pixels.
  // A good approximation of DOM_DELTA_LINE (1) is 5% of viewport size or
  // ~40 pixels, for DOM_DELTA_SCREEN (2) it is 87.5% of viewport size.
  deltaMode: 0,
};
export const SyntheticWheelEvent =
  createSyntheticEvent(WheelEventInterface);

const FocusEventInterface: EventInterfaceType = {
  ...UIEventInterface,
  relatedTarget: 0,
};
export const SyntheticFocusEvent =
  createSyntheticEvent(FocusEventInterface);