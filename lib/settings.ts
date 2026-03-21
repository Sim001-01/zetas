export type ScheduleRange = {
  start: string;
  end: string;
}

export type ScheduleConfig = {
  enabled: boolean;
  ranges: ScheduleRange[];
}

export interface Settings {
  openingDays: number[]; // 0-6, 0=Sunday
  timeSlots: {
    start: string;
    end: string;
    interval: number; // minutes
  };
  daySchedules: Record<string, ScheduleConfig>;
  specialDateSchedules: Record<string, ScheduleConfig>; // YYYY-MM-DD
  closedDays: number[];
  openDates: string[]; // YYYY-MM-DD overrides (force open)
  closedDates: string[]; // YYYY-MM-DD overrides (force closed)
}

export async function fetchSettings(): Promise<Settings> {
  const res = await fetch('/api/settings', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch settings');
  return res.json();
}

export async function saveSettings(settings: Settings): Promise<Settings> {
  const res = await fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error('Failed to save settings');
  return res.json();
}
