// Map numbers are never reused; ids never change once created.
export const nextNumber = houses => houses.reduce((max, h) => Math.max(max, h.mapNumber), 0) + 1;
export const idForNumber = n => `stop-${String(n).padStart(2, '0')}`;
