export function intervalsOverlap(
  existingStart: Date,
  existingEnd: Date,
  newStart: Date,
  newEnd: Date,
): boolean {
  return existingStart < newEnd && existingEnd > newStart;
}
