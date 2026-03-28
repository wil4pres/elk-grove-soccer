'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { ProgramLevel } from '@/lib/programs'

/* ── Quiz data ─────────────────────────────────────────────── */

interface QuizOption {
  label: string
  value: string
}

interface QuizStep {
  id: string
  question: string
  subtext: string
  options: QuizOption[]
}

const steps: QuizStep[] = [
  {
    id: 'age',
    question: 'How old is your player?',
    subtext: 'This helps us narrow down the right age group.',
    options: [
      { label: '4–6 years old', value: '4-6' },
      { label: '7–9 years old', value: '7-9' },
      { label: '10–12 years old', value: '10-12' },
      { label: '13–16 years old', value: '13-16' },
    ],
  },
  {
    id: 'experience',
    question: "What's their soccer experience?",
    subtext: 'No wrong answer — every player starts somewhere.',
    options: [
      { label: 'Brand new to soccer', value: 'none' },
      { label: 'Played a season or two', value: 'some' },
      { label: 'A few years of regular play', value: 'experienced' },
      { label: 'Competitive / travel experience', value: 'competitive' },
    ],
  },
  {
    id: 'goal',
    question: 'What matters most to your family?',
    subtext: 'Think about what your child would enjoy — not what sounds impressive.',
    options: [
      { label: 'Fun & friends — just let them play', value: 'fun' },
      { label: 'Learn the game & build confidence', value: 'development' },
      { label: 'Compete & improve with serious coaching', value: 'compete' },
      { label: 'College pathway or highest level possible', value: 'elite' },
    ],
  },
  {
    id: 'commitment',
    question: 'How much time can your family commit?',
    subtext: 'Be honest — the right fit respects your schedule.',
    options: [
      { label: 'Weekends only (1 day/week)', value: 'low' },
      { label: '2–3 days per week', value: 'medium' },
      { label: '4+ days per week including travel', value: 'high' },
      { label: 'Just a camp or clinic (short-term)', value: 'camp' },
    ],
  },
]

/* ── Recommendation engine ─────────────────────────────────── */

interface Recommendation {
  level: ProgramLevel
  label: string
  tagline: string
  reason: string
  color: string
  borderColor: string
  dotColor: string
  price: string
  commitment: string
  tryout: string
}

const programInfo: Record<ProgramLevel, Recommendation> = {
  'future-stars': {
    level: 'future-stars',
    label: 'Future Stars',
    tagline: 'Ages 4–6 · U5–U7',
    reason: '',
    color: 'text-aqua',
    borderColor: 'border-aqua/[0.2]',
    dotColor: 'bg-aqua',
    price: '$95',
    commitment: '1 day/week · Saturdays',
    tryout: 'No tryout — open enrollment',
  },
  recreational: {
    level: 'recreational',
    label: 'Recreational',
    tagline: 'Ages 7–12 · U8–U12',
    reason: '',
    color: 'text-leaf',
    borderColor: 'border-leaf/[0.2]',
    dotColor: 'bg-leaf',
    price: '$195',
    commitment: 'Weekends · 1–2 games/week',
    tryout: 'No tryout — open enrollment',
  },
  select: {
    level: 'select',
    label: 'Select',
    tagline: 'Ages 10+ · U11 and up',
    reason: '',
    color: 'text-sunset',
    borderColor: 'border-sunset/[0.2]',
    dotColor: 'bg-sunset',
    price: '$325',
    commitment: '3 days/week · Tue/Thu + weekends',
    tryout: 'Free coach evaluation in March',
  },
  academy: {
    level: 'academy',
    label: 'Academy',
    tagline: 'Ages 12–16 · U13–U16',
    reason: '',
    color: 'text-rose',
    borderColor: 'border-rose/[0.2]',
    dotColor: 'bg-rose',
    price: '$480',
    commitment: '3–4 days/week + regional travel',
    tryout: 'Formal tryout · Scholarships available',
  },
  camps: {
    level: 'camps',
    label: 'Camps & Clinics',
    tagline: 'All ages · Seasonal',
    reason: '',
    color: 'text-amber',
    borderColor: 'border-amber/[0.2]',
    dotColor: 'bg-amber',
    price: 'From $95',
    commitment: 'Varies — single week to biweekly',
    tryout: 'No tryout — open enrollment',
  },
}

type Answers = Record<string, string>

function getRecommendation(answers: Answers): { primary: Recommendation; alternate: Recommendation | null } {
  const { age, experience, goal, commitment } = answers

  // Camp shortcut — if they only want a camp/clinic, recommend that regardless
  if (commitment === 'camp') {
    return {
      primary: {
        ...programInfo.camps,
        reason: 'You\'re looking for a short-term option — our camps and clinics are perfect for building skills without a season-long commitment.',
      },
      alternate: age === '4-6'
        ? { ...programInfo['future-stars'], reason: 'If your little one catches the soccer bug, Future Stars is a great next step — just one day a week.' }
        : age === '7-9' || age === '10-12'
          ? { ...programInfo.recreational, reason: 'If they love it, Recreational is an easy step up — weekend games, no tryouts, and a great community.' }
          : null,
    }
  }

  // Ages 4–6: always Future Stars (they can't join other programs)
  if (age === '4-6') {
    return {
      primary: {
        ...programInfo['future-stars'],
        reason: 'At this age, soccer should feel like play. Future Stars is designed for first-time players — parent-friendly, one day a week, and all about having fun.',
      },
      alternate: {
        ...programInfo.camps,
        reason: 'Our Summer Intensive Camp is also great for young players who want a focused week of soccer.',
      },
    }
  }

  // Ages 7–9: Recreational (default) or possibly camps
  if (age === '7-9') {
    if (goal === 'fun' || goal === 'development') {
      return {
        primary: {
          ...programInfo.recreational,
          reason: 'Recreational is the heart of Elk Grove Soccer — weekend games, local leagues, and a community that loves the game. No tryouts, no pressure.',
        },
        alternate: {
          ...programInfo.camps,
          reason: 'Want to sharpen specific skills? Our camps and clinics offer focused training alongside the regular season.',
        },
      }
    }
    // Even if they want to compete at 7-9, rec is the right call
    return {
      primary: {
        ...programInfo.recreational,
        reason: 'Even for competitive kids, Recreational is the right starting point at this age. Research shows players who focus on fun and development early stick with the sport longer and perform better later.',
      },
      alternate: {
        ...programInfo.camps,
        reason: 'Add a camp or goalkeeper clinic to build skills while they grow into Select eligibility at age 10+.',
      },
    }
  }

  // Ages 10–12: Rec, Select, or Camps depending on answers
  if (age === '10-12') {
    // Low commitment or fun-focused → Rec
    if (commitment === 'low' || goal === 'fun') {
      return {
        primary: {
          ...programInfo.recreational,
          reason: 'Your player can keep enjoying the game without the extra demands of travel soccer. Rec is built for families who want great soccer on a manageable schedule.',
        },
        alternate: experience === 'competitive' || experience === 'experienced'
          ? { ...programInfo.select, reason: 'If they\'re ready for more, Select offers structured training 3 days a week with regional competition.' }
          : { ...programInfo.camps, reason: 'Camps are a great add-on for building skills alongside the regular Rec season.' },
      }
    }

    // Medium commitment + development or compete → Select if experienced enough
    if (commitment === 'medium' && (goal === 'compete' || goal === 'development')) {
      if (experience === 'competitive' || experience === 'experienced') {
        return {
          primary: {
            ...programInfo.select,
            reason: 'Your player has the experience and your family has the time — Select offers real coaching, structured training, and regional competition without the full Academy commitment.',
          },
          alternate: {
            ...programInfo.recreational,
            reason: 'If the schedule feels tight, Recreational still offers great soccer with weekend-only games and no tryout.',
          },
        }
      }
      return {
        primary: {
          ...programInfo.recreational,
          reason: 'Rec is the best fit right now — it builds skills and confidence in a supportive environment. Once they\'ve got a couple strong seasons, Select will be a natural next step.',
        },
        alternate: {
          ...programInfo.select,
          reason: 'Our March evaluations are free — if you\'re curious, there\'s no harm in having them try out.',
        },
      }
    }

    // High commitment + elite/compete → Select (too young for Academy)
    if (commitment === 'high' && (goal === 'elite' || goal === 'compete')) {
      return {
        primary: {
          ...programInfo.select,
          reason: 'Select is the best competitive option at this age. Academy opens at 12, so building strong fundamentals in Select now sets your player up for that pathway.',
        },
        alternate: {
          ...programInfo.camps,
          reason: 'Add our Goalkeeper Academy or Summer Intensive to accelerate development alongside Select.',
        },
      }
    }

    // Default for 10-12
    return {
      primary: {
        ...programInfo.recreational,
        reason: 'Recreational keeps soccer fun and social while your player continues to grow. No tryouts, weekends only, and a great community.',
      },
      alternate: {
        ...programInfo.select,
        reason: 'When they\'re ready for more structure, Select is the natural next step.',
      },
    }
  }

  // Ages 13–16: Select, Academy, Rec, or Camps
  if (age === '13-16') {
    // Low commitment or fun → Rec
    if (commitment === 'low' || goal === 'fun') {
      return {
        primary: {
          ...programInfo.recreational,
          reason: 'Plenty of older players love Rec — it\'s about playing the game with friends, staying active, and having fun without the travel demands.',
        },
        alternate: {
          ...programInfo.camps,
          reason: 'Our camps and clinics let them sharpen skills on their own schedule.',
        },
      }
    }

    // Elite goal + high commitment + competitive experience → Academy
    if (goal === 'elite' && commitment === 'high' && (experience === 'competitive' || experience === 'experienced')) {
      return {
        primary: {
          ...programInfo.academy,
          reason: 'Academy is our highest-performance pathway — GPS tracking, college advisory, and coaching modeled after top California academies. Built for players with serious aspirations.',
        },
        alternate: {
          ...programInfo.select,
          reason: 'If the Academy commitment feels like a lot, Select still offers high-quality competitive soccer with slightly less travel.',
        },
      }
    }

    // Compete + medium/high commitment → Select or Academy depending on experience
    if (goal === 'compete' || goal === 'elite') {
      if (experience === 'competitive' && commitment === 'high') {
        return {
          primary: {
            ...programInfo.academy,
            reason: 'With competitive experience and the time to commit, Academy is where your player can reach their ceiling — college advisory and regional travel included.',
          },
          alternate: {
            ...programInfo.select,
            reason: 'Select is a great competitive option with a bit less travel if the Academy schedule doesn\'t fit.',
          },
        }
      }
      return {
        primary: {
          ...programInfo.select,
          reason: 'Select is the right level of competition — structured training, real coaching, and regional games. A great bridge if they\'re eyeing Academy down the road.',
        },
        alternate: experience === 'none' || experience === 'some'
          ? { ...programInfo.recreational, reason: 'If they\'re newer to the game, Rec is a pressure-free way to build confidence before stepping up.' }
          : { ...programInfo.academy, reason: 'If they\'re ready for the top level, Academy tryouts are held each spring — scholarships available.' },
      }
    }

    // Development goal
    if (goal === 'development') {
      if (experience === 'competitive' || experience === 'experienced') {
        return {
          primary: {
            ...programInfo.select,
            reason: 'Select offers the structured coaching and competitive environment that helps experienced players continue growing.',
          },
          alternate: {
            ...programInfo.camps,
            reason: 'Add a specialty clinic to work on specific areas alongside the regular season.',
          },
        }
      }
      return {
        primary: {
          ...programInfo.recreational,
          reason: 'Rec is a great development environment — supportive coaches, regular games, and no pressure. The best way to build confidence and fall in love with the game.',
        },
        alternate: {
          ...programInfo.select,
          reason: 'When they feel ready, Select evaluations are free and low-pressure.',
        },
      }
    }
  }

  // Fallback
  return {
    primary: {
      ...programInfo.recreational,
      reason: 'Recreational is our most popular program — a great fit for most families.',
    },
    alternate: null,
  }
}

/* ── Component ─────────────────────────────────────────────── */

const STORAGE_KEY = 'egs-program-finder'

export default function ProgramFinder() {
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState<Answers>({})
  const [showResult, setShowResult] = useState(false)

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as { answers: Answers; step: number; showResult: boolean }
        setAnswers(parsed.answers)
        setCurrentStep(parsed.step)
        setShowResult(parsed.showResult)
      }
    } catch { /* ignore */ }
  }, [])

  // Persist to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ answers, step: currentStep, showResult }))
    } catch { /* ignore */ }
  }, [answers, currentStep, showResult])

  function handleSelect(stepId: string, value: string) {
    const newAnswers = { ...answers, [stepId]: value }
    setAnswers(newAnswers)

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      setShowResult(true)
    }
  }

  function handleBack() {
    if (showResult) {
      setShowResult(false)
    } else if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  function handleReset() {
    setAnswers({})
    setCurrentStep(0)
    setShowResult(false)
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
  }

  const step = steps[currentStep]
  const progress = showResult ? 100 : ((currentStep) / steps.length) * 100

  // ── Result view ──
  if (showResult) {
    const { primary, alternate } = getRecommendation(answers)

    return (
      <div className="flex flex-col gap-6">
        {/* Progress bar */}
        <div className="w-full h-1 bg-white/[0.08] rounded-full overflow-hidden">
          <div className="h-full bg-leaf rounded-full transition-all duration-500" style={{ width: '100%' }} />
        </div>

        <div className="text-center mb-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-leaf mb-2">Your Match</p>
          <h3 className="text-2xl font-bold text-cloud">We recommend&hellip;</h3>
        </div>

        {/* Primary recommendation */}
        <div className={`bg-white/[0.04] border ${primary.borderColor} rounded-3xl p-6 md:p-8`}>
          <div className="flex items-center gap-2 mb-3">
            <span className={`w-2.5 h-2.5 rounded-full ${primary.dotColor}`} />
            <span className={`text-sm font-bold uppercase tracking-widest ${primary.color}`}>
              {primary.tagline}
            </span>
          </div>
          <h4 className={`text-3xl font-bold mb-3 ${primary.color}`}>{primary.label}</h4>
          <p className="text-sm text-cloud/65 leading-relaxed mb-5">{primary.reason}</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <div className="bg-white/[0.04] rounded-xl p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-cloud/35 mb-0.5">Starting at</p>
              <p className="text-lg font-bold text-cloud">{primary.price}</p>
            </div>
            <div className="bg-white/[0.04] rounded-xl p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-cloud/35 mb-0.5">Commitment</p>
              <p className="text-sm font-semibold text-cloud/70">{primary.commitment}</p>
            </div>
            <div className="bg-white/[0.04] rounded-xl p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-cloud/35 mb-0.5">Tryout</p>
              <p className="text-sm font-semibold text-cloud/70">{primary.tryout}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href={`/register`}
              className="flex-1 text-center bg-gradient-to-r from-leaf to-sunset text-midnight font-bold rounded-2xl py-3.5 px-6 text-sm hover:opacity-90 active:scale-[0.97] transition-all"
            >
              Register Now
            </Link>
            <Link
              href={`#${primary.level}`}
              className="flex-1 text-center bg-white/[0.08] border border-white/[0.12] text-cloud font-semibold rounded-2xl py-3.5 px-6 text-sm hover:bg-white/[0.12] transition-colors"
            >
              Learn More
            </Link>
          </div>
        </div>

        {/* Alternate recommendation */}
        {alternate && (
          <div className={`bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5`}>
            <p className="text-xs font-semibold uppercase tracking-widest text-cloud/35 mb-2">Also consider</p>
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-2 h-2 rounded-full ${alternate.dotColor}`} />
              <span className={`text-sm font-bold ${alternate.color}`}>{alternate.label}</span>
              <span className="text-xs text-cloud/40">{alternate.price}/season</span>
            </div>
            <p className="text-sm text-cloud/55 leading-relaxed mb-3">{alternate.reason}</p>
            <Link
              href={`#${alternate.level}`}
              className="text-sm font-semibold text-leaf hover:text-neon transition-colors"
            >
              View {alternate.label} details &rarr;
            </Link>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={handleBack}
            className="text-sm text-cloud/40 hover:text-cloud/60 transition-colors"
          >
            &larr; Change last answer
          </button>
          <button
            onClick={handleReset}
            className="text-sm text-cloud/40 hover:text-cloud/60 transition-colors"
          >
            Start over
          </button>
        </div>
      </div>
    )
  }

  // ── Quiz step view ──
  return (
    <div className="flex flex-col gap-6">
      {/* Progress bar */}
      <div className="w-full h-1 bg-white/[0.08] rounded-full overflow-hidden">
        <div
          className="h-full bg-leaf rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-cloud/35 uppercase tracking-widest">
          Question {currentStep + 1} of {steps.length}
        </p>
        {currentStep > 0 && (
          <button
            onClick={handleBack}
            className="text-xs text-cloud/40 hover:text-cloud/60 transition-colors"
          >
            &larr; Back
          </button>
        )}
      </div>

      {/* Question */}
      <div>
        <h3 className="text-xl font-bold text-cloud mb-1">
          <span className="text-leaf mr-2">{currentStep + 1}.</span>
          {step.question}
        </h3>
        <p className="text-sm text-cloud/45">{step.subtext}</p>
      </div>

      {/* Options */}
      <div className="flex flex-col gap-2.5">
        {step.options.map((option) => {
          const isSelected = answers[step.id] === option.value
          return (
            <button
              key={option.value}
              onClick={() => handleSelect(step.id, option.value)}
              className={`text-left px-5 py-4 rounded-2xl border text-sm font-medium transition-all active:scale-[0.98] ${
                isSelected
                  ? 'bg-leaf/[0.12] border-leaf/[0.3] text-cloud'
                  : 'bg-white/[0.04] border-white/[0.08] text-cloud/70 hover:bg-white/[0.08] hover:border-white/[0.15] hover:text-cloud'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>

      {/* Summary chips for answered steps */}
      {currentStep > 0 && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-white/[0.06]">
          {steps.slice(0, currentStep).map((s) => {
            const answer = s.options.find((o) => o.value === answers[s.id])
            if (!answer) return null
            return (
              <button
                key={s.id}
                onClick={() => { setCurrentStep(steps.indexOf(s)); setShowResult(false) }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-xs text-cloud/50 hover:text-cloud/70 hover:border-white/[0.15] transition-colors"
              >
                <span className="w-1 h-1 rounded-full bg-leaf" />
                {answer.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
