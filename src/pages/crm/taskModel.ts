export function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function taskStatus(done: boolean, due: string, today = localDateKey()) {
  if (done) return 'completed';
  if (!due) return 'unscheduled';
  const day = due.slice(0, 10);
  return day < today ? 'overdue' : day === today ? 'today' : 'upcoming';
}

export function matchesTask(title: string, contact: string, status: string, query: string, filter: string) {
  return (filter === 'all' || status === filter) && `${title} ${contact} ${status} ${status === 'completed' ? 'done' : 'pending open'}`.toLowerCase().includes(query.trim().toLowerCase());
}

export function followUpStatus(label: string | undefined, at: string | undefined, today: string) {
  if (at) return taskStatus(false, at, today);
  if (/tomorrow/i.test(label || '')) return 'upcoming';
  if (/today/i.test(label || '')) return 'today';
  const parsed = Date.parse(label || '');
  return Number.isNaN(parsed) ? 'unscheduled' : taskStatus(false, localDateKey(new Date(parsed)), today);
}
