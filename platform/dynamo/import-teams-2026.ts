/**
 * Import 2026 season teams from coach spreadsheet into egs-teams.
 * Run: npx tsx platform/dynamo/import-teams-2026.ts
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, BatchWriteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'

const client = new DynamoDBClient({
  region: process.env.DYNAMO_REGION ?? 'us-east-1',
  credentials: {
    accessKeyId: process.env.DYNAMO_ACCESS_KEY_ID!,
    secretAccessKey: process.env.DYNAMO_SECRET_ACCESS_KEY!,
  },
})
const db = DynamoDBDocumentClient.from(client)
const TABLE = 'egs-teams'

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function lastName(name: string) {
  if (!name.trim()) return ''
  const parts = name.trim().split(/\s+/)
  return parts[parts.length - 1]
}

interface RawEntry {
  coach: string
  team: string
  role?: string
}

interface AgeGroup {
  birth_year: string
  gender: 'Male' | 'Female'
  entries: RawEntry[]
}

const ageGroups: AgeGroup[] = [
  {
    birth_year: '2018', gender: 'Female',
    entries: [
      { coach: 'Doug Braddock',     team: 'Pink Panthers',        role: 'Head Coach' },
      { coach: 'Katie Naster',      team: 'Pink Panthers',        role: 'Assistant Coach' },
      { coach: 'Chris Betzler',     team: 'Pink Tigers',          role: 'Head Coach' },
      { coach: 'Mackenzi Berkheimer',team: 'Pink Tigers',         role: 'Assistant Coach' },
      { coach: 'Matthew Bingham',   team: 'Pink Tigers',          role: 'Assistant Coach' },
      { coach: 'Eric Finley',       team: 'Blue Angels',          role: 'Head Coach' },
      { coach: 'Mike Oprean',       team: 'Blue Angels',          role: 'Assistant Coach' },
      { coach: 'Natasha Pate',      team: 'K-Pops',               role: 'Head Coach' },
      { coach: 'Israel Wiggington', team: 'Lady Bugs',            role: 'Head Coach' },
      { coach: 'Courtney O\'hara',  team: 'Lightning Strikers',   role: 'Head Coach' },
      { coach: 'Tyler Lintemuth',   team: 'Lightning Strikers',   role: 'Assistant Coach' },
      { coach: 'Gilbert Echevarria',team: 'Pink Dragons',         role: 'Head Coach' },
      { coach: 'Tom Mooney',        team: 'Sparkle Squad',        role: 'Head Coach' },
      { coach: 'Harry Khangura',    team: 'Sparkle Squad',        role: 'Assistant Coach' },
      { coach: 'Josh Lex',          team: 'Sparkle Squad',        role: 'Assistant Coach' },
    ],
  },
  {
    birth_year: '2018', gender: 'Male',
    entries: [
      { coach: 'Adam Smith',              team: 'RM Sharks',         role: 'Head Coach' },
      { coach: 'Lauren Madrigal',         team: 'RM Sharks',         role: 'Assistant Coach' },
      { coach: 'Simion Fields',           team: 'RM Sharks',         role: 'Assistant Coach' },
      { coach: 'Ryan Lorey',              team: 'RM Sharks',         role: 'Assistant Coach' },
      { coach: 'Joe Airoso',              team: 'RM Sharks',         role: 'Assistant Coach' },
      { coach: 'Nic Duval',               team: 'RM Sharks',         role: 'Assistant Coach' },
      { coach: 'Cody Davis',              team: 'Boys Team 4',       role: 'Head Coach' },
      { coach: 'Ana Brown',               team: 'Boys Team 6',       role: 'Head Coach' },
      { coach: 'Alejandro Rodriguez',     team: 'Boys Team 7',       role: 'Head Coach' },
      { coach: 'Jonathan Garcia de Alba', team: 'Black Panthers',    role: 'Head Coach' },
      { coach: 'Jessica Leonard',         team: 'Black Panthers',    role: 'Assistant Coach' },
      { coach: 'Kori Salas',              team: 'Legends',           role: 'Head Coach' },
      { coach: 'Praneel Atwal',           team: 'Liverbirds',        role: 'Head Coach' },
      { coach: 'Jaylee Williams',         team: 'Liverbirds',        role: 'Assistant Coach' },
      { coach: 'Jessica Farnham',         team: 'Tater Tots',        role: 'Head Coach' },
      { coach: 'Anthony Rivas',           team: 'Tater Tots',        role: 'Assistant Coach' },
      { coach: 'Tyler Jacoby',            team: 'Tater Tots',        role: 'Assistant Coach' },
      { coach: 'David Stincelli',         team: 'The WarLords',      role: 'Head Coach' },
    ],
  },
  {
    birth_year: '2017', gender: 'Female',
    entries: [
      { coach: 'Juan Chavez',      team: 'Rainbow Dashers' },
      { coach: 'Benjamin Le',      team: 'Shooting Stars' },
      { coach: 'JP Chimienti',     team: 'Thunder Kats' },
      { coach: 'Isaac Davalos',    team: 'Fire Flowers' },
      { coach: 'Rebekah Wright',   team: 'Cherry Bombs' },
      { coach: 'Andi Linley',      team: 'Unstoppables' },
      { coach: 'Joseph Salais',    team: 'Shooting Stars 2' },
      { coach: '',                 team: 'Galaxy' },
      { coach: 'Brittany Bunnell', team: 'RM Fire Dragons' },
    ],
  },
  {
    birth_year: '2017', gender: 'Male',
    entries: [
      { coach: 'Miguel Arana',        team: 'Blue Tigers' },
      { coach: 'Matt Boitano',        team: 'Hornets' },
      { coach: 'Kristen Bowden',      team: 'Heat' },
      { coach: 'Brandon Saleen',      team: 'Sharks' },
      { coach: 'Micah Stubbs',        team: 'Firehawks' },
      { coach: 'Gary Flores',         team: 'Cougars' },
      { coach: 'Tabor Ramsey',        team: 'Fireballs' },
      { coach: 'Ben Harrell',         team: 'Wolfpack' },
      { coach: 'Vu Chu',              team: 'Rangers' },
      { coach: 'Jason Latoski',       team: 'Shooting Stars' },
      { coach: 'James Millholland',   team: 'Kraken FC' },
      { coach: 'Juan Jose Chavez',    team: 'Galaxy' },
      { coach: 'Nick Rammer',         team: 'Tiger Sharks' },
      { coach: 'Rob Chavez',          team: 'Big Dawgs' },
      { coach: 'Tony Driver',         team: 'Murieta Meatballs' },
      { coach: 'Kaitlin Bauer',       team: 'RM Dragons' },
    ],
  },
  {
    birth_year: '2016', gender: 'Female',
    entries: [
      { coach: 'Madelyn Pack',        team: 'Lightning Leopards' },
      { coach: 'Russell Platner',     team: 'Chelsea East' },
      { coach: 'Adam Newquist',       team: 'Lily Tigers' },
      { coach: 'Martin Popish',       team: 'Butterflies' },
      { coach: 'Raul Orellana',       team: 'Hurricanes' },
      { coach: 'John Van Den Raadt',  team: 'RM Shooting Stars' },
      { coach: 'Kevin Kreutzer',      team: 'RM Panthers' },
      { coach: 'Jonathan Robertson',  team: 'Blue Thunder' },
      { coach: 'Luis Bravo',          team: 'Flying Elk' },
      { coach: 'Ryan Hofer',          team: 'Hot Shots' },
      { coach: 'Josh Gordon',         team: 'Broncos' },
    ],
  },
  {
    birth_year: '2016', gender: 'Male',
    entries: [
      { coach: 'Sanjiwan Boparai',        team: 'Avengers' },
      { coach: 'Savanna Morfin',          team: 'Little Legends' },
      { coach: 'Iyana Terrell-Barefield', team: 'Razorbacks' },
      { coach: 'Antonio Castaneda',       team: 'New East Lions' },
      { coach: 'Thomas Mehl',             team: 'Ninjas' },
      { coach: 'Andrew Franco',           team: 'Dragons' },
      { coach: 'Shoaib Muhammad Shaikh',  team: 'Hawks' },
      { coach: 'Alex Fox',                team: 'Sharks' },
      { coach: 'Brandon Anderson',        team: 'Jaguars' },
      { coach: 'John Jia',                team: 'AFC Richmond' },
      { coach: 'Eddie Murillo',           team: 'Tornados' },
      { coach: 'Mutaz Awad',              team: 'Panthers' },
      { coach: 'Kamden Brakel',           team: 'RM Scorpions' },
      { coach: 'Josh Weidenbach',         team: 'RM Gladiators' },
    ],
  },
  {
    birth_year: '2015', gender: 'Female',
    entries: [
      { coach: 'Sarah Trujillo',   team: 'Wolf Pack' },
      { coach: 'Francisco Salinas',team: 'Vipers' },
      { coach: 'Adam Hurst',       team: 'Lady Wolverines' },
      { coach: 'Edward Mitchell',  team: 'Banshees' },
      { coach: 'Sarah Poore',      team: 'Rascals' },
      { coach: 'Sarahanne Mora',   team: 'Powerpuff Goals' },
      { coach: 'Boris Castro',     team: 'Chariots of Fire' },
      { coach: 'Meghan McDonald',  team: 'RM Killer Bees' },
    ],
  },
  {
    birth_year: '2015', gender: 'Male',
    entries: [
      { coach: 'John Shea',         team: 'Fire Dragons' },
      { coach: 'Don Hewlett',       team: 'Team Thunder' },
      { coach: 'Amanda Tolosano',   team: 'Aston Villa Lions' },
      { coach: 'Jaymison Jones',    team: 'Raptors' },
      { coach: 'Spenser Kuntz',     team: 'Hotshots' },
      { coach: 'Brandon Lamera',    team: 'Turf Thrashers' },
      { coach: 'Craig Riddle',      team: 'Goal Crusherz' },
      { coach: 'Daniel Garcia',     team: 'Rockets' },
      { coach: 'Kevin Campbell',    team: 'Wolverines' },
      { coach: 'Carlos Rodriguez',  team: 'Wildhawks' },
      { coach: 'Stephanie Terrell', team: 'Steelers' },
      { coach: 'Leo Anaya',         team: 'Rebels' },
      { coach: 'Denise Russell',    team: 'Dragons' },
      { coach: 'Juan Chavez',       team: 'Galaxy' },
      { coach: 'Tony Driver',       team: 'Inter Murieta' },
      { coach: 'Kurt Bunnell',      team: 'RM Honey Badgers' },
    ],
  },
  {
    birth_year: '2014', gender: 'Female',
    entries: [
      { coach: 'Maddie Lopez',      team: 'Unstoppables' },
      { coach: 'Sofia Rosier',      team: 'Blue Cheetahs' },
      { coach: 'Nathan Elken',      team: 'Pink Lightning' },
      { coach: 'Megan Martinez',    team: 'The Ladybugs' },
      { coach: 'Courtney Russell',  team: 'RM Lightning Ladies' },
      { coach: 'Edward Mitchell',   team: 'Thunder' },
      { coach: 'Tressa Vagneur',    team: 'Pink Panthers' },
      { coach: 'Manny Uche',        team: 'Dream Team' },
      { coach: 'Sarah Smoldon',     team: 'The Mighty Ducks' },
      { coach: 'Ryan Bettencourt',  team: 'Los Tigres' },
    ],
  },
  {
    birth_year: '2014', gender: 'Male',
    entries: [
      { coach: 'Craig Hibbard',   team: 'Raptors' },
      { coach: 'Justin Mueller',  team: 'Earthquakes' },
      { coach: 'Brad Eastham',    team: 'Junior Eagles' },
      { coach: 'Thomas Mehl',     team: 'Vikings' },
      { coach: 'Marcos Diaz',     team: 'Blue Raptors' },
      { coach: 'Blair Chapman',   team: 'The Vandals' },
      { coach: 'Tim O\'Brien',    team: 'Panthers' },
      { coach: '',                team: 'Wolves' },
      { coach: 'Brandon Tafoya', team: 'RM Mustangs' },
    ],
  },
  {
    birth_year: '2013', gender: 'Male',
    entries: [
      { coach: 'Philip Comer',      team: 'Legends' },
      { coach: 'Tabor Ramsey',      team: 'Robot Ninjas' },
      { coach: 'Kevin Henschel',    team: 'Blue Dragons' },
      { coach: 'Brandon Anderson',  team: 'Avengers' },
      { coach: '',                  team: 'Crushers' },
      { coach: 'Chris Daniels',     team: 'Venom' },
      { coach: 'Carlos Rodriguez',  team: 'Diamond Dogs' },
      { coach: 'Juan Chavez',       team: 'ThunderSharks' },
      { coach: '',                  team: 'Monstars' },
    ],
  },
  {
    birth_year: '2012', gender: 'Female',
    entries: [
      { coach: 'Maya Sandoval',    team: 'Tigers' },
      { coach: 'Elaine Brogle',    team: 'Lady Dragons' },
      { coach: 'Teresa Thompson',  team: 'Diamonds' },
      { coach: 'Danny Kershaw',    team: 'RM Hawks' },
      { coach: 'Sarah Poore',      team: 'Rebels' },
      { coach: 'Aaron Johnson',    team: 'Sidekicks' },
      { coach: 'Wesley Braymer',   team: 'Goal Crushers' },
      { coach: 'Spenser Kuntz',    team: 'Hotshots' },
    ],
  },
  {
    birth_year: '2012', gender: 'Male',
    entries: [
      { coach: 'Johnny Mez',     team: 'Cheetahs' },
      { coach: 'John Pullen',    team: 'Dragon Sharks' },
      { coach: 'Mike Bailey',    team: 'Destroyers' },
      { coach: 'Nabeel AlSaber', team: 'Ninjas' },
      { coach: 'Gary Flores',    team: 'Cougars' },
      { coach: 'Thomas Mehl',    team: 'Warriors' },
    ],
  },
  {
    birth_year: '2010', gender: 'Female',
    entries: [
      { coach: 'Tabor Ramsey',  team: 'Piranhas' },
      { coach: 'Jaymison Jones',team: 'Epic Ducks' },
      { coach: 'Craig Riddle',  team: 'Flash' },
      { coach: 'Ben Harrell',   team: 'Cheetahs' },
      { coach: 'Omar Silmi',    team: 'Blazers' },
      { coach: 'John Costa',    team: 'Firestorm' },
    ],
  },
  {
    birth_year: '2010', gender: 'Male',
    entries: [
      { coach: 'Dan Templeton',    team: 'Predators' },
      { coach: 'Ghavinn Crutcher', team: 'Wolfpack' },
      { coach: 'Alex Fox',         team: 'Wolves' },
      { coach: 'Hoa Quach',        team: 'Tigers' },
      { coach: 'Eddie Murillo',    team: 'Tornados FC' },
      { coach: 'Javier Ruiz',      team: 'Wolf Pack' },
    ],
  },
  {
    birth_year: '2007', gender: 'Female',
    entries: [
      { coach: 'Erin Sladen',       team: 'Thunder' },
      { coach: 'Megan Lea',         team: 'Shooting Stars' },
      { coach: 'Luis Echevarria',   team: 'Panthers' },
      { coach: 'Eddie Jordan',      team: 'Thunder 2' },
      { coach: 'Dave Groves',       team: 'Mustangs' },
      { coach: 'Stephanie Gonzales',team: 'Intensity' },
    ],
  },
  {
    birth_year: '2007', gender: 'Male',
    entries: [
      { coach: 'Omar Silmi',       team: 'Lanterns' },
      { coach: 'John Pullen',      team: 'Dynamites' },
      { coach: 'Antonio De Leon',  team: 'Wolves' },
      { coach: 'David Kincannon',  team: 'Predators' },
      { coach: 'Philip Carey',     team: 'Arsenal' },
      { coach: 'Sabrina Buksh',    team: 'Warriors' },
    ],
  },
]

async function main() {
  // Check no 2026 teams already exist
  const existing = await db.send(new ScanCommand({
    TableName: TABLE,
    FilterExpression: 'season = :s',
    ExpressionAttributeValues: { ':s': '2026' },
    Select: 'COUNT',
  }))
  if ((existing.Count ?? 0) > 0) {
    console.log(`⚠️  ${existing.Count} 2026 teams already exist. Delete them first.`)
    process.exit(1)
  }

  // Build team records — one per unique team within each age group
  const teams: Record<string, any>[] = []
  const gCode = (g: 'Male' | 'Female') => g === 'Male' ? 'B' : 'G'

  for (const ag of ageGroups) {
    // Collect head coaches per team
    const teamCoach = new Map<string, string>()
    for (const e of ag.entries) {
      if (!teamCoach.has(e.team)) {
        // First entry wins if no role specified; head coach wins if role given
        if (!e.role || e.role === 'Head Coach') {
          teamCoach.set(e.team, e.coach)
        }
      } else if (e.role === 'Head Coach') {
        teamCoach.set(e.team, e.coach)
      }
    }

    for (const [teamNick, coachName] of teamCoach) {
      const gc = gCode(ag.gender)
      const coachLast = lastName(coachName)
      const teamName = coachLast
        ? `${ag.birth_year}${gc} ${teamNick} (${coachLast})`
        : `${ag.birth_year}${gc} ${teamNick}`
      const teamId = `2026-${slug(teamName)}`

      teams.push({
        team_id: teamId,
        team_name: teamName,
        season: '2026',
        birth_year: ag.birth_year,
        gender: ag.gender,
        coach_last_name: coachLast,
      })
    }
  }

  console.log(`Importing ${teams.length} teams for season 2026...`)

  const CHUNK = 25
  let written = 0
  for (let i = 0; i < teams.length; i += CHUNK) {
    const chunk = teams.slice(i, i + CHUNK)
    await db.send(new BatchWriteCommand({
      RequestItems: {
        [TABLE]: chunk.map(item => ({ PutRequest: { Item: item } })),
      },
    }))
    written += chunk.length
    process.stdout.write(`\r  Written ${written}/${teams.length}...`)
  }

  console.log(`\n✅ Done — ${written} teams imported`)

  // Summary by age group
  const byYear: Record<string, number> = {}
  for (const t of teams) {
    const k = `${t.birth_year} ${t.gender}`
    byYear[k] = (byYear[k] ?? 0) + 1
  }
  for (const [k, n] of Object.entries(byYear).sort()) {
    console.log(`  ${k}: ${n} teams`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
