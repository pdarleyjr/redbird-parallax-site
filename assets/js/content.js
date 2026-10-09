// Shared, dependency-free publication rules for the build and browser.
export function localAsset(value, prefix = 'assets/') {
  if (typeof value !== 'string' || !value.startsWith(prefix)) return null;
  if (!/^[a-zA-Z0-9_./-]+$/.test(value) || value.split('/').some(part => !part || part === '.' || part === '..')) return null;
  return value;
}

export function registrationURL(registration) {
  if (registration?.status !== 'confirmed') return null;
  try {
    const url = new URL(registration.url);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function approvedHouses(data, year) {
  if (data?.year !== year || data.status !== 'approved' || !Array.isArray(data.houses)) return [];
  const frequency = new Map();
  for (const house of data.houses) {
    if (house && typeof house.id === 'string') frequency.set(house.id, (frequency.get(house.id) || 0) + 1);
  }
  return data.houses.filter(house => {
    if (!house || house.status !== 'approved' || typeof house.id !== 'string' || frequency.get(house.id) !== 1) return false;
    return /^[a-zA-Z0-9_-]{1,80}$/.test(house.id) &&
      typeof house.name === 'string' && house.name.trim().length > 0 && house.name.length <= 500 &&
      typeof house.address === 'string' && house.address.trim().length > 0 && house.address.length <= 500 &&
      !/[\u0000-\u001f]/.test(house.name + house.address) &&
      Number.isInteger(house.mapNumber) && house.mapNumber > 0 &&
      Number.isFinite(house.order);
  }).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id)).map(house => ({
    ...house, name: house.name.trim(), address: house.address.trim(), image: localAsset(house.image)
  }));
}

export function eventLabels(event) {
  if (!Number.isInteger(event.year) || !/^\d{4}-\d{2}-\d{2}$/.test(event.date) || !event.date.startsWith(`${event.year}-`)) throw new Error('Event year and date must agree.');
  const date = new Date(`${event.date}T12:00:00Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== event.date) throw new Error('Invalid event date.');
  const options = { timeZone: event.timeZone, month: 'long', day: 'numeric' };
  const day = new Intl.DateTimeFormat('en-US', { ...options, weekday: 'long' }).format(date);
  const fullDate = new Intl.DateTimeFormat('en-US', { ...options, weekday: 'long', year: 'numeric' }).format(date);
  let hours = 'Event hours will be announced';
  if (event.hours?.status === 'confirmed') {
    const format = value => {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error('Invalid confirmed hours.');
      const [h, m] = value.split(':').map(Number);
      return `${h % 12 || 12}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h >= 12 ? 'PM' : 'AM'}`;
    };
    hours = `${format(event.hours.start)}–${format(event.hours.end)}`;
  }
  return { day, fullDate, hours };
}
