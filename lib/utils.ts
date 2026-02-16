export function calculateAge(dateOfBirth: string | null): string {
  if (!dateOfBirth) return 'Unknown age';
  const birth = new Date(dateOfBirth);
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
  const date = new Date(dateString);
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
