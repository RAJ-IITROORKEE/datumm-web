// Which Revit device the workspace uses after a device list refresh.
// Keeps the current choice while it is online (or when nothing else is), so a person's pick is never
// overridden by another device; picks the first online device when there is no choice or it went offline.
export function chooseDevice(previous, list) {
  const current = list.find((device) => device.id === previous);
  if (current?.online) return previous;
  return list.find((device) => device.online)?.id ?? previous ?? '';
}
