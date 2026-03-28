import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { getStaff, type Staff } from '@/lib/data'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Staff Directory',
  description:
    'Meet the coaching staff and age group coordinators behind Elk Grove Soccer. Experienced coaches dedicated to player development at every level.',
}

const agcData = [
  {
    id: 'dave-groves',
    name: 'Dave Groves',
    ageGroup: 'U19 (2007–2009), U16 (2010/2011), U14 (2012) & U13 (2013)',
    detail: 'Boys & Girls',
    photo: '/staff/dave-groves.gif',
    bio: 'I have been a coach with Elk Grove Soccer since 2002, and have been an administrator in the club since 2003. I have served as first vice president for the past 10 years. I currently coach 3 teams in the club — 2008G Platinum, 2010G Platinum, and HSG Fuego, in addition to coaching Monterey Trail High School girls. I have been a referee for about 15 years as well. I am dedicated to making sure all kids in our community have an opportunity to play soccer no matter what their skill level is, or family/financial constraints are. I coached all 3 of my children in the club, and my son has been a referee and coach in the club as well.',
    offField: 'When not doing soccer, I am the 6am Producer for KCRA TV, where I have worked since 1998.',
  },
  {
    id: 'david-kincannon',
    name: 'David Kincannon',
    ageGroup: 'U12/U11 (2015/2014)',
    detail: 'Boys',
    photo: '/staff/david-kincannon.gif',
    bio: 'I have been a coach with Elk Grove Soccer since 2017. My eldest son has played on the recreation and competitive side. My two daughters have both played recreation. I\'ve coached all of them. Before joining EGYSL, I coached and helped out at Greenhaven Soccer Club and volunteered for the YMCA\'s youth soccer program. Soccer has been a huge part of my life since I was 5 years old. It played a huge role in my becoming who I am today, and I love the fact that I get to share my passion for the sport with players and parents in our community. I love to play still, but these days I get the most enjoyment out of watching young players develop, figure the game out, and fall in love with the game that I\'ve loved for well over 30 years.',
    offField: 'When I\'m not coaching or watching soccer, I\'m probably watching other sports! I am still very much a kid, so I enjoy video games, being lazy, and riding around town on my motorcycle.',
  },
  {
    id: 'dan-templeton',
    name: 'Dan Templeton',
    ageGroup: 'U9 (2017) & U10 (2016)',
    detail: 'Boys',
    photo: '/staff/dan-templeton.png',
    bio: null,
    offField: null,
  },
  {
    id: 'sara-morin',
    name: 'Sara Morin',
    ageGroup: 'U12/U11 (2015/2014)',
    detail: 'Girls',
    photo: '/staff/sara-morin.jpg',
    bio: 'I am a proud member of the Elk Grove Soccer community with two teenagers who have enjoyed their experience playing for the club. I have been a volunteer coach with EGS for about 10 years and served on the board the past 4 years as an at-large board member where my duties include volunteer age group coordinator, acting as a liaison for the league with coaches and players\' families. I am dedicated to ensuring EGS welcomes new and innovative perspectives. I believe any child in our community should have an opportunity to play soccer regardless of their skill level or financial status. I grew up in Rancho Cordova playing soccer and refereeing. I was fortunate to have wonderful volunteer coaches and teammates show me that individually we are one small piece, but together we are part of something bigger and greater — a team. Those experiences led me to the opportunity to try soccer at the collegiate level at CSU Sacramento, and also start my volunteer coaching career in the American River Youth Soccer League.',
    offField: 'When not involved with soccer, I am working as a Crime Analyst for the State of California.',
  },
  {
    id: 'william-newsom',
    name: 'William Newsom',
    ageGroup: 'U10 (2016)',
    detail: 'Girls',
    photo: '/staff/william-newsom.png',
    bio: 'I currently hold the position of At-Large Board member and am employed at a large financial institution as a Solution Architect. I have been with Elk Grove Soccer for over 10 years and have held several positions in the organization. I held the position of Tournament Director and then successfully oversaw the competitive program for over 5 years as the Vice President of Competitive. I am very passionate about soccer and Elk Grove Soccer as an organization and most importantly its players and families. I have been a part of many successful strategic plans over my career with Elk Grove Soccer and hope to continue as an engaged, open-minded, and customer-focused leader.',
    offField: 'When I\'m not watching a soccer game, I am an avid computer programmer. I love tennis, crossfit, and spending time with my family.',
  },
  {
    id: 'marissa-zamarripa',
    name: 'Marissa Zamarripa',
    ageGroup: 'U9 (2017)',
    detail: 'Girls',
    photo: '/staff/marissa-zamarripa.gif',
    bio: 'I grew up playing soccer for Elk Grove from ages 10–18. As a player, my time at Elk Grove Soccer was incredibly memorable. I want to use my time to grow the club and the community impact it already has. I want to be someone people of the younger generation can go to if they need any assistance. I have also been a volunteer coach for an Elk Grove Soccer U11 Girls Recreational team, which allowed me to gain a new leadership perspective on how to manage not only the players but also the communication with the team parents.',
    offField: 'I honorably served in the United States Navy for five years, where I was responsible for the supervision of seven personnel and the operation and maintenance of heavy machinery on a US Navy ship. This experience taught me skills such as time management, problem solving, and adaptability.',
  },
  {
    id: 'olivia-mattos',
    name: 'Olivia Mattos',
    ageGroup: 'U8 (2018) & U7 (2019)',
    detail: 'Boys & Girls',
    photo: '/staff/olivia-mattos.jpg',
    bio: null,
    offField: null,
  },
  {
    id: 'greig-paterson',
    name: 'Greig Paterson',
    ageGroup: 'U6 (2020) & U5 (2021)',
    detail: 'Boys & Girls',
    photo: '/staff/greig-paterson.jpg',
    bio: null,
    offField: null,
  },
  {
    id: 'doug-mattos',
    name: 'Doug Mattos',
    ageGroup: 'Rancho Murieta',
    detail: 'All Age Groups',
    photo: '/staff/doug-mattos.png',
    bio: 'Doug Mattos has proudly been involved with Elk Grove Soccer for over 13 years serving the members; since 2010 with Rancho Murieta soccer in positions such as Coach, Coach\'s Coordinator, Fields & Equipment Coordinator, and his current role as manager for the program. Since 2014, he has served on the Elk Grove Soccer Board and his current duties involve Coaches Disciplinary Policy and Review and being an Age Group Coordinator. All of his volunteer time and efforts involved with Elk Grove Soccer focus on supporting the best soccer experience for players, parents, referees, and coaches.',
    offField: null,
  },
]

function StaffCard({ member }: { member: Staff }) {
  const initials = member.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)

  return (
    <div className="bg-white/[0.04] border border-white/[0.08] rounded-3xl p-6 flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-leaf/[0.15] border border-leaf/[0.2] flex items-center justify-center shrink-0">
          <span className="text-lg font-bold text-leaf">{initials}</span>
        </div>
        <div>
          <h3 className="text-lg font-bold text-cloud leading-tight">{member.name}</h3>
          <p className="text-sm text-leaf font-medium">{member.role}</p>
        </div>
      </div>
      <p className="text-sm text-cloud/60 leading-relaxed">{member.bio}</p>
      {(member.email || member.phone) && (
        <div className="flex flex-wrap gap-3 pt-2 border-t border-white/[0.06]">
          {member.email && (
            <a href={`mailto:${member.email}`} className="inline-flex items-center gap-1.5 text-xs text-cloud/45 hover:text-leaf transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
              {member.email}
            </a>
          )}
          {member.phone && (
            <a href={`tel:${member.phone.replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-1.5 text-xs text-cloud/45 hover:text-leaf transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.99 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4 .18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 7.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
              {member.phone}
            </a>
          )}
        </div>
      )}
    </div>
  )
}

export default async function StaffPage() {
  const staff = await getStaff()

  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-pine to-midnight px-4 pt-12 pb-14 md:pt-20 md:pb-20">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-60 rounded-full blur-3xl bg-leaf/[0.06]" />
        </div>
        <div className="relative max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.1] text-xs font-semibold text-cloud/60 uppercase tracking-widest mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Staff Directory
          </div>

          <h1 className="text-[clamp(2.5rem,8vw,5rem)] font-bold leading-none tracking-tight mb-3 bg-gradient-to-r from-leaf to-aqua bg-clip-text text-transparent">
            Meet the Team
          </h1>
          <p className="text-lg text-cloud/60 mb-8">
            Licensed coaches, dedicated volunteers, and experienced coordinators — all committed to your player&apos;s growth.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="#coaching-staff"
              className="inline-flex items-center justify-center gap-2 bg-white/[0.08] border border-white/[0.12] text-cloud font-semibold rounded-2xl py-3.5 px-6 text-sm hover:bg-white/[0.12] transition-colors"
            >
              Coaching Staff
            </Link>
            <Link
              href="#age-group-coordinators"
              className="inline-flex items-center justify-center gap-2 bg-white/[0.08] border border-white/[0.12] text-cloud font-semibold rounded-2xl py-3.5 px-6 text-sm hover:bg-white/[0.12] transition-colors"
            >
              Age Group Coordinators
            </Link>
          </div>
        </div>
      </section>

      {/* ── Coaching Staff ────────────────────────────────────── */}
      <section id="coaching-staff" className="px-4 py-14 md:py-20 bg-midnight scroll-mt-24">
        <div className="max-w-5xl mx-auto">
          <div className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-cloud/40 mb-2">Coaches</p>
            <h2 className="text-3xl md:text-4xl font-bold text-cloud mb-3">Coaching Staff</h2>
            <p className="text-cloud/55 text-base max-w-xl">
              Our coaching team brings years of playing and coaching experience to every session — from Future Stars to Academy.
            </p>
          </div>

          {staff.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {staff.map((member) => (
                <StaffCard key={member.id} member={member} />
              ))}
            </div>
          ) : (
            <div className="bg-white/[0.04] border border-white/[0.07] rounded-3xl p-8 text-center">
              <p className="text-cloud/40">Coaching staff profiles coming soon.</p>
            </div>
          )}
        </div>
      </section>

      {/* ── Age Group Coordinators — Grid ─────────────────────── */}
      <section id="age-group-coordinators" className="px-4 py-14 md:py-20 bg-pine/30 border-t border-white/[0.06] scroll-mt-24">
        <div className="max-w-5xl mx-auto">
          <div className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-cloud/40 mb-2">Coordinators</p>
            <h2 className="text-3xl md:text-4xl font-bold text-cloud mb-3">Age Group Coordinators</h2>
            <p className="text-cloud/55 text-base max-w-xl">
              Your first point of contact for scheduling, team placement, and questions about your player&apos;s age group. Tap a coordinator to learn more.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {agcData.map((agc) => (
              <a
                key={agc.id}
                href={`#${agc.id}`}
                className="bg-white/[0.04] border border-white/[0.08] rounded-3xl p-5 flex items-start gap-4 hover:bg-white/[0.07] hover:border-sunset/[0.3] transition-all group"
              >
                <div className="w-16 h-16 rounded-full overflow-hidden shrink-0 border-2 border-sunset/[0.3]">
                  <Image
                    src={agc.photo}
                    alt={agc.name}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-cloud group-hover:text-sunset transition-colors">{agc.name}</h3>
                  <p className="text-sm text-sunset font-semibold mt-0.5">{agc.ageGroup}</p>
                  <p className="text-xs text-cloud/40 mt-0.5">{agc.detail}</p>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-cloud/20 group-hover:text-sunset shrink-0 mt-1 transition-colors">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </a>
            ))}
          </div>

          <div className="mt-8 bg-white/[0.04] border border-white/[0.07] rounded-2xl p-5">
            <p className="text-sm text-cloud/55 leading-relaxed">
              <span className="font-semibold text-cloud/70">Not sure who to contact?</span>{' '}
              Email{' '}
              <a href="mailto:registrar@elkgrovesoccer.com" className="text-leaf hover:text-neon underline underline-offset-2 transition-colors">
                registrar@elkgrovesoccer.com
              </a>{' '}
              and we&apos;ll connect you with the right coordinator for your player&apos;s age group.
            </p>
          </div>
        </div>
      </section>

      {/* ── Coordinator Profiles ──────────────────────────────── */}
      <section className="px-4 py-14 md:py-20 bg-midnight border-t border-white/[0.06]">
        <div className="max-w-4xl mx-auto">
          <div className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-cloud/40 mb-2">Profiles</p>
            <h2 className="text-3xl md:text-4xl font-bold text-cloud">Coordinator Profiles</h2>
          </div>

          <div className="flex flex-col gap-10">
            {agcData.map((agc) => (
              <div
                key={agc.id}
                id={agc.id}
                className="bg-white/[0.04] border border-white/[0.08] rounded-3xl p-6 md:p-8 scroll-mt-24"
              >
                <div className="flex flex-col sm:flex-row gap-6">
                  {/* Photo */}
                  <div className="shrink-0">
                    <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-2 border-sunset/[0.3]">
                      <Image
                        src={agc.photo}
                        alt={agc.name}
                        width={128}
                        height={128}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-cloud mb-1">{agc.name}</h3>
                    <p className="text-sm text-sunset font-semibold mb-1">{agc.ageGroup}</p>
                    <p className="text-xs text-cloud/40 mb-4">{agc.detail}</p>

                    {agc.bio ? (
                      <div className="flex flex-col gap-3">
                        <p className="text-sm text-cloud/65 leading-relaxed">{agc.bio}</p>
                        {agc.offField && (
                          <p className="text-sm text-cloud/50 leading-relaxed italic">{agc.offField}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-cloud/40 italic">Profile coming soon.</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Join the Team CTA ─────────────────────────────────── */}
      <section className="px-4 py-14 bg-pine/30 border-t border-white/[0.06]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-cloud mb-3">Interested in coaching?</h2>
          <p className="text-cloud/55 text-base mb-8 leading-relaxed">
            We&apos;re always looking for passionate volunteers. Whether you&apos;ve coached before or just love the game, there&apos;s a place for you.
          </p>
          <a
            href="mailto:coaching@elkgrovesoccer.com"
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-leaf to-sunset text-midnight font-bold rounded-2xl py-4 px-8 text-base hover:opacity-90 active:scale-[0.97] transition-all"
          >
            Get in Touch
          </a>
        </div>
      </section>
    </>
  )
}
