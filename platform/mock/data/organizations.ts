import type { SEOrganization } from '../../types/sportsengine.js'

export const organizations: SEOrganization[] = [
  {
    id: 'org-egs-001',
    name: 'Elk Grove Soccer',
    abbreviation: 'EGS',
    sport: 'soccer',
    timezone: 'America/Los_Angeles',
    status: 'active',
    address: {
      street1: '9720 Elk Grove Florin Road',
      city: 'Elk Grove',
      state: 'CA',
      zip: '95624',
      country: 'US',
      lat: 38.4088,
      lon: -121.3716,
    },
    contact: {
      email: 'info@elkgrovesoccer.com',
      phone: '(916) 555-0180',
    },
    websiteUrl: 'https://sacramento.soccer',
    createdAt: '2020-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
]
