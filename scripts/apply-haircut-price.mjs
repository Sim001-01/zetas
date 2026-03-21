const TARGET_PRICE = 10
const TARGET_NAMES = ['taglio capelli', 'taglio di capelli']
const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3005'

const normalize = (value) => String(value || '').trim().toLowerCase()

const run = async () => {
  const listRes = await fetch(`${baseUrl}/api/services`, { cache: 'no-store' })
  if (!listRes.ok) {
    throw new Error(`Failed to load services: ${listRes.status}`)
  }

  const services = await listRes.json()
  if (!Array.isArray(services) || services.length === 0) {
    throw new Error('No services found')
  }

  const byExact = services.find((service) => TARGET_NAMES.includes(normalize(service?.name)))
  const target = byExact || services.find((service) => normalize(service?.name).includes('taglio capelli'))

  if (!target?.id) {
    throw new Error('Target haircut service not found')
  }

  const patchRes = await fetch(`${baseUrl}/api/services/${target.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ price: TARGET_PRICE }),
  })

  if (!patchRes.ok) {
    const text = await patchRes.text()
    throw new Error(`Failed to update service: ${patchRes.status} ${text}`)
  }

  const updated = await patchRes.json()
  console.log(`updatedService=${updated.name}`)
  console.log(`updatedPrice=${updated.price}`)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
