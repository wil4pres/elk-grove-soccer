export type ProgramLevel = 'future-stars' | 'recreational' | 'select' | 'academy' | 'camps'
export type RegistrationStatus = 'open' | 'opens-soon' | 'waitlist' | 'closed'

export interface Program {
  id: string
  name: string
  level: ProgramLevel
  ageBand: string
  season: string
  price: number
  capacity: number
  enrolled: number
  registrationStatus: RegistrationStatus
  opensDate?: string
  description: string
  highlights: string[]
  commitment: string
  whoIsItFor: string
}

export const mockPrograms: Program[] = [
  {
    id: 'future-stars',
    name: 'Future Stars',
    level: 'future-stars',
    ageBand: 'Ages 4–6 (U5–U7)',
    season: 'Spring 2026',
    price: 95,
    capacity: 60,
    enrolled: 38,
    registrationStatus: 'open',
    description: 'First kicks, big smiles. A playful introduction to soccer with parent participation welcome.',
    highlights: ['Saturdays only', 'Parent participation welcome', 'No experience needed', 'Skills through games'],
    commitment: 'Low — 1 day/week',
    whoIsItFor: 'Kids ages 4–6 exploring soccer for the first time.',
  },
  {
    id: 'recreational',
    name: 'Recreational',
    level: 'recreational',
    ageBand: 'Ages 7–12 (U8–U12)',
    season: 'Spring 2026',
    price: 195,
    capacity: 120,
    enrolled: 87,
    registrationStatus: 'open',
    description: 'Local leagues, weekend games, and a love for the sport. No tryouts required.',
    highlights: ['Weekend games only', 'Local pods', 'Volunteer credits for parents', 'No tryouts'],
    commitment: 'Low — weekends only',
    whoIsItFor: 'Kids who want to play and have fun without the pressure of competitive soccer.',
  },
  {
    id: 'select-11u',
    name: '11U Select',
    level: 'select',
    ageBand: 'Ages 10–11 (U11)',
    season: 'Spring 2026',
    price: 325,
    capacity: 24,
    enrolled: 19,
    registrationStatus: 'open',
    description: 'Structured training with competitive weekend fixtures. Coach-led development and goalkeeper clinics included.',
    highlights: ['Tue / Thu training + weekends', 'Free goalkeeper clinics', 'Mental skills labs', 'Small rosters'],
    commitment: 'Medium — 3 days/week',
    whoIsItFor: 'Motivated players ready to train consistently and compete at the regional level.',
  },
  {
    id: 'academy-navy',
    name: 'Academy Navy',
    level: 'academy',
    ageBand: 'Ages 12–16 (U13–U16)',
    season: 'Spring 2026',
    price: 480,
    capacity: 20,
    enrolled: 18,
    registrationStatus: 'open',
    description: 'High-performance pathway with college advisory, GPS tracking, and regional travel. Scholarships available.',
    highlights: ['Mon / Wed + Sat travel', 'College advisory included', 'Scholarships available', 'GPS performance tracking'],
    commitment: 'High — 3–4 days/week + travel',
    whoIsItFor: 'Serious players with college or professional aspirations. Tryout required.',
  },
  {
    id: 'summer-intensive',
    name: 'Summer Intensive Camp',
    level: 'camps',
    ageBand: 'Ages 7–16 (U8–U16)',
    season: 'Summer 2026',
    price: 250,
    capacity: 80,
    enrolled: 0,
    registrationStatus: 'opens-soon',
    opensDate: 'April 15, 2026',
    description: 'Full-day summer camp with position-specific coaching, lunch included. July 7–11.',
    highlights: ['July 7–11 daily', 'Position-specific coaching', 'Lunch included', 'All skill levels'],
    commitment: 'One week',
    whoIsItFor: 'All players ages 7–16 looking to improve their game over the summer.',
  },
  {
    id: 'goalkeeper-academy',
    name: 'Goalkeeper Academy',
    level: 'camps',
    ageBand: 'Ages 8–16 (U9–U16)',
    season: 'Spring 2026',
    price: 150,
    capacity: 20,
    enrolled: 12,
    registrationStatus: 'open',
    description: 'Specialized goalkeeper training every other Saturday. Open to all skill levels.',
    highlights: ['Every other Saturday', 'Certified GK coach', 'All skill levels', 'Video review included'],
    commitment: 'Low — biweekly sessions',
    whoIsItFor: 'Goalkeepers of any level looking for position-specific development.',
  },
]
