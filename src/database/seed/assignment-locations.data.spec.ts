import {
  ASSIGNMENT_LOCATIONS,
  ASSIGNMENT_LOCATION_NUMBERS,
} from './assignment-locations.data';

describe('assignment-locations.data', () => {
  it('defines 15 unique location numbers with valid parent references', () => {
    expect(ASSIGNMENT_LOCATIONS).toHaveLength(15);
    expect(new Set(ASSIGNMENT_LOCATION_NUMBERS).size).toBe(15);

    const numbers = new Set(ASSIGNMENT_LOCATION_NUMBERS);
    for (const row of ASSIGNMENT_LOCATIONS) {
      if (row.parentLocationNumber) {
        expect(numbers.has(row.parentLocationNumber)).toBe(true);
      }
    }
  });

  it('marks bookable rooms with department, capacity, and openHours', () => {
    const bookableNumbers = [
      'A-01-01',
      'A-01-02',
      'A-01-03',
      'B-05-11',
      'B-05-12',
      'B-05-13',
      'B-05-14',
    ];

    for (const locationNumber of bookableNumbers) {
      const row = ASSIGNMENT_LOCATIONS.find(
        (entry) => entry.locationNumber === locationNumber,
      );
      expect(row?.department).toBeTruthy();
      expect(row?.capacity).toBeGreaterThan(0);
      expect(row?.openHours).toBeTruthy();
    }
  });
});
