const payload = {
  openingDays: [2, 3, 4, 5, 6],
  timeSlots: {
    start: '08:30',
    end: '20:30',
    interval: 15,
  },
  daySchedules: {
    '0': { enabled: false, ranges: [{ start: '09:00', end: '20:00' }] },
    '1': { enabled: false, ranges: [{ start: '09:00', end: '20:00' }] },
    '2': { enabled: true, ranges: [{ start: '09:00', end: '12:45' }, { start: '15:30', end: '20:15' }] },
    '3': { enabled: true, ranges: [{ start: '09:00', end: '12:45' }, { start: '15:30', end: '20:15' }] },
    '4': { enabled: true, ranges: [{ start: '09:00', end: '12:45' }, { start: '15:30', end: '20:15' }] },
    '5': { enabled: true, ranges: [{ start: '09:00', end: '13:00' }, { start: '15:00', end: '20:30' }] },
    '6': { enabled: true, ranges: [{ start: '08:30', end: '19:45' }] },
  },
  specialDateSchedules: {},
  closedDays: [0, 1],
  openDates: [],
  closedDates: [],
}

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3005'

const run = async () => {
  const response = await fetch(`${baseUrl}/api/settings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Failed to update settings: ${response.status} ${text}`)
  }

  const updated = await response.json()
  const line = (day) => updated.daySchedules[day].ranges.map((range) => `${range.start}-${range.end}`).join(' | ')
  console.log(`interval=${updated.timeSlots.interval}`)
  console.log(`mon=${updated.daySchedules['1'].enabled ? line('1') : 'closed'}`)
  console.log(`tue=${line('2')}`)
  console.log(`wed=${line('3')}`)
  console.log(`thu=${line('4')}`)
  console.log(`fri=${line('5')}`)
  console.log(`sat=${line('6')}`)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
