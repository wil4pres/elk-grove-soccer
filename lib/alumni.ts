export interface AlumniStory {
  id: string
  name: string
  gradYear: number
  currentRole: string
  currentOrg: string
  quote: string
  milestones: { year: number; achievement: string }[]
}

export const mockAlumni: AlumniStory[] = [
  {
    id: 'mia-santos',
    name: 'Mia Santos',
    gradYear: 2022,
    currentRole: 'Midfielder',
    currentOrg: 'Bay FC',
    quote: "Elk Grove taught me how to compete. The coaching here is what got me to the next level.",
    milestones: [
      { year: 2016, achievement: 'Academy captain · NorCal Champions' },
      { year: 2019, achievement: 'Pathway scholarship · USYNT camp invite' },
      { year: 2022, achievement: 'Full ride to UC Davis' },
      { year: 2024, achievement: 'Drafted · Bay FC — NWSL debut' },
    ],
  },
  {
    id: 'carlos-rivera',
    name: 'Carlos Rivera',
    gradYear: 2019,
    currentRole: 'Defender',
    currentOrg: 'Sacramento Republic FC',
    quote: "I still remember my first practice at Cherry Island. This club shaped everything.",
    milestones: [
      { year: 2015, achievement: 'Select program · Regional finalist' },
      { year: 2018, achievement: 'Academy Navy captain · State semifinal' },
      { year: 2019, achievement: 'Scholarship · San Jose State' },
      { year: 2023, achievement: 'Signed · Sacramento Republic FC' },
    ],
  },
  {
    id: 'jade-kim',
    name: 'Jade Kim',
    gradYear: 2021,
    currentRole: 'Forward',
    currentOrg: 'Stanford University',
    quote: "The coaches here never let me settle. They pushed me further than I thought I could go.",
    milestones: [
      { year: 2017, achievement: 'Future Stars grad · joined Recreational' },
      { year: 2019, achievement: 'Select program · Top scorer NorCal league' },
      { year: 2021, achievement: 'Academy Navy · NorCal Premier runners-up' },
      { year: 2022, achievement: 'Full scholarship · Stanford Cardinal' },
    ],
  },
]
