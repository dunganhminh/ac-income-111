export function toVNTime(dateInput?: string | number | Date | null): Date {
  const d = dateInput ? new Date(dateInput) : new Date();
  const targetTimezoneOffset = 7 * 60; // Vietnam is GMT+7 (in minutes)
  const localTimezoneOffset = d.getTimezoneOffset(); // -600 min for GMT+10, etc.
  
  // Shift the internal epoch so local methods (getHours, getDate, etc.) return values as if we are in Vietnam
  const shiftedEpoch = d.getTime() + (localTimezoneOffset * 60000) + (targetTimezoneOffset * 60000);
  return new Date(shiftedEpoch);
}
