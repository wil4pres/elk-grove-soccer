export type SponsorTier = 'premier' | 'community'

export interface Sponsor {
  id: string
  name: string
  tier: SponsorTier
  tagline: string
  initials: string
  ctaLabel: string
  ctaHref: string
}

export const mockSponsors: Sponsor[] = [
  { id: 'sentinel-health', name: 'Sentinel Health', tier: 'premier', tagline: 'Sideline care, hydration pods, and post-match recovery for every Elk Grove family.', initials: 'SH', ctaLabel: 'Visit Sentinel Health', ctaHref: '#' },
  { id: 'capital-bakes', name: 'Capital Bakes', tier: 'community', tagline: 'Fueling Elk Grove families since 2012.', initials: 'CB', ctaLabel: 'Order online', ctaHref: '#' },
  { id: 'river-city-credit', name: 'River City Credit Union', tier: 'community', tagline: 'Banking built for Elk Grove families.', initials: 'RC', ctaLabel: 'Open an account', ctaHref: '#' },
  { id: 'crush-pt', name: 'Crush PT', tier: 'community', tagline: 'Sports physical therapy. Get back in the game.', initials: 'PT', ctaLabel: 'Book a visit', ctaHref: '#' },
  { id: 'sac-orthopedics', name: 'Sac Orthopedics', tier: 'community', tagline: 'Keeping athletes healthy all season long.', initials: 'SO', ctaLabel: 'Learn more', ctaHref: '#' },
]
