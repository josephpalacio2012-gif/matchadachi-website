import { useEffect, useMemo, useState } from 'react'
import site from './config/site.json'
import menu from './config/menu.json'
import {
  type Answers,
  type DrinkPick,
  type QuestionId,
  type Recommendation,
  levelPrimer,
  personas,
  questions,
  recommend,
} from './lib/recommend'
import { initTracking, track } from './lib/track'

type Route = 'home' | 'quiz'
type QuizScreen = 'landing' | 'questions' | 'reveal' | 'result'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** matchadachi.ph/quiz (the QR code) opens the quiz page; everything else is the home page. */
const routeFromPath = (): Route => (/\/quiz\/?$/.test(window.location.pathname) ? 'quiz' : 'home')

export default function App() {
  const [route, setRoute] = useState<Route>(routeFromPath)
  const [screen, setScreen] = useState<QuizScreen>('landing')
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Partial<Answers>>({})
  const [rec, setRec] = useState<Recommendation | null>(null)

  useEffect(() => initTracking(), [])
  useEffect(() => {
    const onPop = () => {
      setRoute(routeFromPath())
      setScreen('landing')
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  useEffect(() => {
    if (window.location.hash) {
      document.getElementById(window.location.hash.slice(1))?.scrollIntoView()
    } else {
      window.scrollTo({ top: 0 })
    }
  }, [route, screen, step])

  const go = (to: Route, hash = '') => {
    const path = to === 'quiz' ? '/quiz' : '/'
    try {
      window.history.pushState({}, '', path + hash)
    } catch {
      /* preview frames may block history; the view still switches */
    }
    setRoute(to)
  }

  const start = () => {
    setAnswers({})
    setStep(0)
    setRec(null)
    setScreen('questions')
    if (route !== 'quiz') go('quiz')
    track('quiz_start')
  }

  const answer = (q: QuestionId, optionId: string) => {
    const next = { ...answers, [q]: optionId }
    setAnswers(next)
    window.setTimeout(
      () => {
        if (step < questions.length - 1) {
          setStep(step + 1)
        } else {
          const r = recommend(next as Answers)
          setRec(r)
          track('quiz_complete', {
            persona: r.persona.name,
            product: r.primary.displayName,
          })
          setScreen('reveal')
          window.setTimeout(() => setScreen('result'), prefersReducedMotion() ? 300 : 1900)
        }
      },
      prefersReducedMotion() ? 0 : 240,
    )
  }

  const goHome = (hash = '') => {
    setScreen('landing')
    go('home', hash)
  }

  return (
    <div className="app">
      {route === 'home' && <Home onStart={start} />}
      {route === 'quiz' && screen === 'landing' && <QuizLanding onStart={start} onHome={() => goHome()} />}
      {route === 'quiz' && screen === 'questions' && (
        <Quiz
          step={step}
          answers={answers}
          onAnswer={answer}
          onBack={() => (step === 0 ? setScreen('landing') : setStep(step - 1))}
        />
      )}
      {route === 'quiz' && screen === 'reveal' && rec && <Reveal rec={rec} />}
      {route === 'quiz' && screen === 'result' && rec && (
        <Result
          rec={rec}
          answers={answers as Answers}
          onRetake={() => {
            track('retake_click', { persona: rec.persona.name })
            start()
          }}
          onHome={() => {
            track('explore_home_click', { persona: rec.persona.name })
            goHome('#menu')
          }}
        />
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */

const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`

function Wordmark({ showMenuLink = false }: { showMenuLink?: boolean }) {
  return (
    <header className="topbar">
      <img className="logo" src={asset('brand/logo-wordmark.png')} alt="Matchadachi" width="900" height="116" />
      {showMenuLink ? (
        <nav className="topbar-nav" aria-label="Page sections">
          <a href="#menu">Menu</a>
          <a href="#visit">Branches</a>
        </nav>
      ) : (
        <span className="topbar-place">{site.tagline}</span>
      )}
    </header>
  )
}

const swatchClass: Record<string, string> = { L1: 'sw-l1', L2: 'sw-l2', JB: 'sw-jb' }

function Scale({ active }: { active?: string }) {
  return (
    <ol className="scale" aria-label="Matcha personas from gentle to complex">
      {personas.map((p) => (
        <li key={p.id} className={`scale-step ${active === p.id ? 'is-active' : ''}`}>
          <span className={`swatch ${swatchClass[p.variant]}`} aria-hidden="true" />
          <span className="scale-name">{p.name.replace('Matcha ', '')}</span>
          <span className="scale-blend">{p.variant === 'JB' ? 'Japan Blend' : `Level ${p.variant.slice(1)}`}</span>
        </li>
      ))}
    </ol>
  )
}

function Home({ onStart }: { onStart: () => void }) {
  const [first, second] = site.campaignLine.split('. ')
  return (
    <main className="home">
      <Wordmark showMenuLink />
      <section className="hero">
        <p className="eyebrow">The Dachi Matcha Quiz</p>
        <h1 className="hero-title">
          <span>{first}.</span>
          <span className="hero-accent">{second}</span>
        </h1>
        <p className="hero-sub">
          Five quick questions. You'll get your matcha persona and the exact Matchadachi drink to
          order.
        </p>
        <div className="hero-cta">
          <button className="btn btn-primary btn-lg" onClick={onStart} id="start-quiz">
            Find my matcha
          </button>
          <span className="hero-meta">5 questions · about a minute</span>
        </div>
        <div className="hero-scale">
          <Scale />
        </div>
      </section>

      <figure className="hero-photo">
        <img
          src={asset('brand/bestsellers-wide.jpg')}
          alt="Matchadachi best sellers lined up: Ichicha, Torocha, Shiocha and more"
          width="1800"
          height="600"
        />
      </figure>

      <section className="personas" aria-labelledby="personas-title">
        <h2 id="personas-title" className="section-title">
          Three ways to enjoy matcha
        </h2>
        <p className="section-sub">Different tastes, all equally good. Find the one that's yours.</p>
        <div className="persona-grid">
          {personas.map((p) => (
            <article key={p.id} className="persona-card">
              <span className={`swatch swatch-lg ${swatchClass[p.variant]}`} aria-hidden="true" />
              <h3>{p.name}</h3>
              <p className="persona-blend">{p.blend}</p>
              <p className="persona-profile">{p.profile}</p>
            </article>
          ))}
        </div>
        <button className="btn btn-ghost" onClick={onStart}>
          Take the quiz
        </button>
      </section>

      <MenuSection onStart={onStart} />

      <section className="blends" aria-labelledby="blends-title">
        <h2 id="blends-title" className="section-title">
          Two blends, one love for matcha
        </h2>
        <div className="blend-grid">
          {site.blends.map((b) => (
            <article key={b.id} className={`blend blend-${b.id}`}>
              <img src={asset(b.image)} alt={b.imageAlt} width="1100" height="1100" loading="lazy" />
              <div className="blend-body">
                <p className="blend-levels">{b.levels}</p>
                <h3>{b.name}</h3>
                <p className="blend-line">{b.line}</p>
                <ul>
                  {b.points.map((pt) => (
                    <li key={pt}>{pt}</li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
        <p className="blends-footer">{site.blendsFooter}</p>
      </section>

      <section id="visit" className="visit" aria-labelledby="visit-title">
        <div className="visit-text">
          <h2 id="visit-title" className="section-title">
            Visit a Matchadachi
          </h2>
          <p className="section-sub">Take the quiz, then show your result at any branch.</p>
        </div>
        <ul className="branch-list">
          {site.branches.map((br) => (
            <li key={br.name} className="branch">
              {br.photo ? (
                <img className="branch-photo" src={asset(br.photo)} alt={`${br.name}`} width="720" height="900" loading="lazy" />
              ) : (
                <div className="branch-photo branch-ph" aria-hidden="true">
                  <img src={asset('brand/favicon.png')} alt="" width="256" height="256" />
                </div>
              )}
              <div className="branch-text">
                <span className="branch-type">{br.type}</span>
                <span className="branch-name">{br.name}</span>
                <span className="branch-address">{br.address}</span>
                <span className="branch-note">{br.note}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <Footer />
    </main>
  )
}

const blendLabel: Record<string, string> = { L1: 'Level 1', L2: 'Level 2', JB: 'Japan Blend' }

interface MenuItem {
  name: string
  description: string
  photo: string
  blends: string[]
  where?: string
}
interface MenuGroup {
  id: string
  label: string
  note: string
  items: MenuItem[]
}
const menuGroups = menu.groups as MenuGroup[]

function MenuSection({ onStart }: { onStart: () => void }) {
  const [tab, setTab] = useState(menuGroups[0].id)
  const group = menuGroups.find((g) => g.id === tab) ?? menuGroups[0]
  return (
    <section id="menu" className="menu" aria-labelledby="menu-title">
      <div className="menu-head">
        <h2 id="menu-title" className="section-title">
          The menu
        </h2>
        <p className="section-sub">{menu.intro}</p>
      </div>
      <div className="menu-tabs" role="tablist" aria-label="Menu categories">
        {menuGroups.map((g) => (
          <button
            key={g.id}
            id={`menu-tab-${g.id}`}
            role="tab"
            aria-selected={g.id === tab}
            className={`menu-tab ${g.id === tab ? 'is-active' : ''}`}
            onClick={() => setTab(g.id)}
          >
            {g.label}
          </button>
        ))}
      </div>
      <p className="menu-note">{group.note}</p>
      <ul className="menu-grid" role="tabpanel" aria-labelledby={`menu-tab-${group.id}`}>
        {group.items.map((item) => (
          <li key={item.name} className="menu-item">
            {item.photo ? (
              <img src={asset(item.photo)} alt={item.name} width="640" height="640" loading="lazy" />
            ) : (
              <div className="menu-ph" aria-hidden="true">
                <span>{item.name}</span>
              </div>
            )}
            <div className="menu-body">
              <h3>{item.name}</h3>
              <p>{item.description}</p>
              {(item.blends.length > 0 || item.where) && (
                <div className="menu-tags">
                  {item.blends.map((b) => (
                    <span key={b} className={`menu-tag tag-${b}`}>
                      {blendLabel[b]}
                    </span>
                  ))}
                  {item.where && <span className="menu-tag tag-where">{item.where}</span>}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
      {group.id === 'matcha' && (
        <div className="menu-cta">
          <p>Not sure which one is yours?</p>
          <button className="btn btn-ghost" onClick={onStart}>
            Take the quiz
          </button>
        </div>
      )}
    </section>
  )
}

function QuizLanding({ onStart, onHome }: { onStart: () => void; onHome: () => void }) {
  const [first, second] = site.campaignLine.split('. ')
  return (
    <main className="landing">
      <header className="landing-top">
        <img className="logo" src={asset('brand/logo-wordmark.png')} alt="Matchadachi" width="900" height="116" />
      </header>
      <section className="landing-hero">
        <img
          className="landing-photo"
          src={asset('brand/japan-blend-lifestyle.jpg')}
          alt="Three Matchadachi matcha drinks on a café table"
          width="1100"
          height="1100"
        />
        <div className="landing-body">
          <img className="landing-mascot" src={asset('brand/favicon.png')} alt="" width="256" height="256" />
          <p className="eyebrow">The Dachi Matcha Quiz</p>
          <h1 className="landing-title">
            <span>{first}.</span>
            <span className="hero-accent">{second}</span>
          </h1>
          <p className="landing-sub">
            Answer 5 quick questions to get your matcha persona and the exact drink to order today.
          </p>
          <button className="btn btn-primary btn-lg btn-block landing-cta" onClick={onStart} id="landing-start">
            Start the quiz
          </button>
          <ul className="landing-steps" aria-label="How it works">
            <li>
              <strong>1</strong> Answer 5 questions
            </li>
            <li>
              <strong>2</strong> Get your drink
            </li>
            <li>
              <strong>3</strong> Show it at the counter
            </li>
          </ul>
        </div>
      </section>
      <p className="landing-foot">
        <button className="link-btn" onClick={onHome}>
          Visit matchadachi.ph
        </button>
      </p>
    </main>
  )
}

function Footer() {
  return (
    <footer className="footer">
      <img className="footer-logo" src={asset('brand/logo-mascot.png')} alt="Matchadachi" width="700" height="274" loading="lazy" />
      <div className="footer-text">
        <span className="footer-meaning">{site.dachiMeaning}</span>
        <span>
          {site.social.handle} · Malolos &amp; Baliwag, Bulacan
        </span>
      </div>
    </footer>
  )
}

/* ------------------------------------------------------------------ */

function Quiz({
  step,
  answers,
  onAnswer,
  onBack,
}: {
  step: number
  answers: Partial<Answers>
  onAnswer: (q: QuestionId, option: string) => void
  onBack: () => void
}) {
  const q = questions[step]
  const selected = answers[q.id]
  return (
    <main className="quiz">
      <div className="quiz-bar">
        <button className="icon-btn" onClick={onBack} aria-label="Go back">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="progress" role="progressbar" aria-valuemin={1} aria-valuemax={questions.length} aria-valuenow={step + 1}>
          {questions.map((_, i) => (
            <span key={i} className={`progress-seg ${i <= step ? 'is-done' : ''}`} />
          ))}
        </div>
        <span className="quiz-count">
          {step + 1}/{questions.length}
        </span>
      </div>

      <section className="question" key={q.id}>
        <p className="eyebrow">Question {step + 1}</p>
        <h2 className="question-text">{q.text}</h2>
        <div className="options">
          {q.options.map((o) => (
            <button
              key={o.id}
              id={`${q.id}-${o.id}`}
              className={`option ${selected === o.id ? 'is-selected' : ''}`}
              onClick={() => onAnswer(q.id, o.id)}
              aria-pressed={selected === o.id}
            >
              <span className="option-dot" aria-hidden="true" />
              <span className="option-label">{o.label}</span>
            </button>
          ))}
        </div>
      </section>
    </main>
  )
}

function Reveal({ rec }: { rec: Recommendation }) {
  return (
    <main className="reveal" aria-live="polite">
      <div className="whisk" aria-hidden="true">
        <span />
        <span />
        <img className="whisk-mascot" src={asset('brand/favicon.png')} alt="" width="256" height="256" />
      </div>
      <p className="reveal-text">Whisking your result…</p>
      <p className="sr-only">{rec.persona.headline}</p>
    </main>
  )
}

/* ------------------------------------------------------------------ */

function Photo({ pick, size = 'hero' }: { pick: DrinkPick; size?: 'hero' | 'thumb' }) {
  const [failed, setFailed] = useState(false)
  if (pick.photo && !failed) {
    return (
      <img
        className={`photo photo-${size}`}
        src={`${import.meta.env.BASE_URL}products/${pick.photo}`}
        alt={pick.displayName}
        onError={() => setFailed(true)}
      />
    )
  }
  return (
    <div className={`photo photo-${size} photo-placeholder`} role="img" aria-label={`${pick.displayName} (photo coming soon)`}>
      <span className="ph-name">{pick.product.name}</span>
      {size === 'hero' && <span className="ph-note">Photo coming soon</span>}
    </div>
  )
}

function answerSummary(answers: Answers): string[] {
  return questions
    .filter((q) => q.id !== 'q4')
    .map((q) => q.options.find((o) => o.id === answers[q.id])?.label ?? '')
    .filter(Boolean)
}

function Result({
  rec,
  answers,
  onRetake,
  onHome,
}: {
  rec: Recommendation
  answers: Answers
  onRetake: () => void
  onHome: () => void
}) {
  // Rotation for "Try Another Matcha": primary → secondary → others → back to primary
  const rotation = useMemo(
    () => [rec.primary, ...(rec.secondary ? [rec.secondary] : []), ...rec.others],
    [rec],
  )
  const [idx, setIdx] = useState(0)
  const [barista, setBarista] = useState(false)
  const current = rotation[idx]
  const isMain = idx === 0
  const isSecond = rec.secondary && current.photoKey === rec.secondary.photoKey
  const persona = rec.persona

  const tryAnother = () => {
    const next = (idx + 1) % rotation.length
    setIdx(next)
    track('try_another_click', { persona: persona.name, product: rotation[next].displayName })
    document.getElementById('drink')?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }

  const openBarista = () => {
    setBarista(true)
    track('show_barista_click', { persona: persona.name, product: current.displayName })
  }

  const label = isMain ? 'Your Match' : isSecond ? 'Also a great match' : `Another ${persona.name} pick`
  const why = isMain
    ? rec.why
    : isSecond
      ? secondaryWhy(rec, current)
      : `Another drink made with ${current.blendNote.split(':')[0]}, chosen for your ${persona.profile.toLowerCase()} taste.`

  return (
    <main className="result">
      <section className="persona-reveal" aria-labelledby="persona-headline">
        <div className="persona-inner">
          <p className="eyebrow eyebrow-light">Your matcha persona</p>
          <h1 id="persona-headline" className="persona-headline">
            {persona.headline}
          </h1>
          <p className="persona-line">
            <span className="chip chip-light">{persona.blend}</span>
            <span className="persona-profile-light">{persona.profile}</span>
          </p>
          <p className="persona-explain">
            {rec.depth === 'brief' ? persona.explainShort : persona.explainLong}
          </p>
          <div className="persona-scale">
            <Scale active={persona.id} />
          </div>
        </div>
      </section>

      <section id="drink" className="drink" aria-labelledby="drink-name">
        <p className="eyebrow">Your Matchadachi drink</p>
        <div className="drink-card" key={current.photoKey}>
          <Photo pick={current} />
          <div className="drink-body">
            <p className="drink-label">{label}</p>
            <h2 id="drink-name" className="drink-name">
              {current.product.name}
              {current.variantLabel && <span className="drink-variant">{current.variantLabel}</span>}
            </h2>
            {current.product.kindLabel && <p className="chip chip-roast">{current.product.kindLabel}</p>}
            <p className="drink-desc">{current.product.description}</p>
            {current.blendNote && rec.depth !== 'brief' && <p className="drink-blend">{current.blendNote}</p>}

            <div className="why">
              <h3 className="why-title">Why this matches you</h3>
              <p>{why}</p>
              {isMain && (
                <ul className="answer-chips" aria-label="Your answers">
                  {answerSummary(answers).map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="actions">
          <button className="btn btn-primary btn-lg btn-block" onClick={openBarista} id="show-barista">
            Show This to Your Barista
          </button>
          <div className="actions-row">
            <button className="btn btn-ghost" onClick={tryAnother} id="try-another">
              Try Another Matcha
            </button>
            <button className="btn btn-ghost" onClick={onRetake} id="retake">
              Retake the Quiz
            </button>
          </div>
        </div>

        {isMain && rec.secondary && (
          <button className="second-pick" onClick={tryAnother}>
            <Photo pick={rec.secondary} size="thumb" />
            <span className="second-text">
              <span className="second-label">
                {rec.secondary.product.kind === 'roasted' ? 'Want to explore roasted tea?' : 'Second pick'}
              </span>
              <span className="second-name">{rec.secondary.displayName}</span>
              <span className="second-desc">{rec.secondary.product.description}</span>
            </span>
          </button>
        )}

        {rec.depth === 'full' && (
          <aside className="primer">
            <h3>New to matcha? A quick guide</h3>
            <p>{levelPrimer}</p>
            <p>Tap “Show This to Your Barista” at the counter and we'll take it from there.</p>
          </aside>
        )}

        <div className="explore">
          <p className="explore-text">Done ordering? See the rest of the Matchadachi menu and our branches.</p>
          <button className="btn btn-primary btn-block" onClick={onHome} id="explore-home">
            Explore Matchadachi
          </button>
        </div>
      </section>

      <Footer />

      {barista && <BaristaCard pick={current} personaName={persona.name} onClose={() => setBarista(false)} />}
    </main>
  )
}

function secondaryWhy(rec: Recommendation, pick: DrinkPick): string {
  if (pick.product.kind === 'roasted')
    return 'Hojicha is a roasted green tea latte, not matcha. Try it if you want to explore roasted Japanese tea flavors.'
  if (pick.product.id === rec.primary.product.id)
    return `You asked for a bolder version of your usual. This is the same drink with stronger ${pick.variantLabel} matcha.`
  return `A close second for your answers. ${pick.product.name} is a ${pick.product.description.toLowerCase().replace(/\.$/, '')}.`
}

function BaristaCard({
  pick,
  personaName,
  onClose,
}: {
  pick: DrinkPick
  personaName: string
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="barista" role="dialog" aria-modal="true" aria-labelledby="barista-name">
      <div className="barista-inner">
        {pick.photo && (
          <img className="barista-photo" src={asset(`products/${pick.photo}`)} alt="" width="160" height="160" />
        )}
        <p className="eyebrow eyebrow-light">Hi! I'd like to order</p>
        <h2 id="barista-name" className="barista-name">
          {pick.product.name}
        </h2>
        {pick.variantLabel && <p className="barista-variant">{pick.variantLabel}</p>}
        {pick.product.kindLabel && <p className="barista-kind">{pick.product.kindLabel}</p>}
        <p className="barista-persona">
          {personaName} · from the Matchadachi quiz
        </p>
        <button className="btn btn-light btn-lg" onClick={onClose} autoFocus>
          Done
        </button>
      </div>
    </div>
  )
}
