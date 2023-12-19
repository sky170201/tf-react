
export function addEventBubbleListener(
  target: EventTarget,
  eventType: string,
  listener,
): Function {
  target.addEventListener(eventType, listener, false);
  return listener;
}

export function addEventCaptureListener(
  target: EventTarget,
  eventType: string,
  listener,
): Function {
  target.addEventListener(eventType, listener, true);
  return listener;
}
