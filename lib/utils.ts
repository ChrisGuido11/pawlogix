export function calculateAge(dateOfBirth: string | null): string {
  if (!dateOfBirth) return 'Unknown age';
  const dob = dateOfBirth.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const birth = dob
    ? new Date(Number(dob[1]), Number(dob[2]) - 1, Number(dob[3]))
    : new Date(dateOfBirth);
  if (isNaN(birth.getTime())) return 'Unknown age';
  const now = new Date();
  const years = now.getFullYear() - birth.getFullYear();
  const months = now.getMonth() - birth.getMonth();
  const totalMonths = years * 12 + months;

  if (totalMonths < 1) return 'Less than 1 month';
  if (totalMonths < 12) return `${totalMonths} month${totalMonths === 1 ? '' : 's'}`;
  const y = Math.floor(totalMonths / 12);
  const m = totalMonths % 12;
  if (m === 0) return `${y} year${y === 1 ? '' : 's'}`;
  return `${y}y ${m}m`;
}

export function formatDate(dateString: string): string {
  // Parse date-only strings (YYYY-MM-DD) as local time, not UTC.
  // new Date("2026-02-15") parses as UTC midnight, which shifts to the
  // previous day in timezones behind UTC (e.g. PST shows Feb 14).
  const dateOnly = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(dateString);
  if (isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function getSeverityColor(severity: 'info' | 'watch' | 'urgent'): {
  bg: string;
  text: string;
} {
  switch (severity) {
    case 'info':
      return { bg: 'bg-info/10', text: 'text-info' };
    case 'watch':
      return { bg: 'bg-warning/10', text: 'text-warning' };
    case 'urgent':
      return { bg: 'bg-error/10', text: 'text-error' };
  }
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) {
    lookup[chars.charCodeAt(i)] = i;
  }

  const len = base64.length;
  if (len === 0) return new ArrayBuffer(0);
  let bufferLength = Math.floor(len * 0.75);
  if (len >= 1 && base64[len - 1] === '=') bufferLength--;
  if (len >= 2 && base64[len - 2] === '=') bufferLength--;

  const arraybuffer = new ArrayBuffer(bufferLength);
  const bytes = new Uint8Array(arraybuffer);

  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const encoded1 = lookup[base64.charCodeAt(i)];
    const encoded2 = lookup[base64.charCodeAt(i + 1)];
    const encoded3 = lookup[base64.charCodeAt(i + 2)];
    const encoded4 = lookup[base64.charCodeAt(i + 3)];

    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
  }

  return arraybuffer;
}

export function getRecordTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    lab_results: 'Lab Results',
    vet_visit: 'Vet Visit',
    vaccine: 'Vaccine Record',
    prescription: 'Prescription',
    other: 'Other',
  };
  return labels[type] ?? 'Record';
}
