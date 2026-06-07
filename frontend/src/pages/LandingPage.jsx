import { useState } from 'react'
import { CSS, Btn } from '../components/UI'
import SignInModal from '../components/SignInModal'
import {
  MapPin, BarChart3, BellRing, MessageSquare, FileText, Users,
  ArrowRight,
} from 'lucide-react'

const SQUARES = [
  { w: 160, t: '8%', l: '4%', rot: 12, o: 0.28, delay: 0 },
  { w: 100, t: '22%', r: '6%', rot: -18, o: 0.22, delay: 1 },
  { w: 80, t: '55%', l: '10%', rot: 25, o: 0.2, delay: 2 },
  { w: 120, b: '18%', r: '12%', rot: -10, o: 0.26, delay: 0.5 },
  { w: 70, b: '32%', l: '18%', rot: 30, o: 0.18, delay: 1.5 },
  { w: 90, t: '40%', r: '22%', rot: -22, o: 0.24, delay: 2.5 },
  { w: 55, t: '70%', l: '42%', rot: 15, o: 0.16, delay: 3 },
  { w: 130, b: '8%', l: '38%', rot: -8, o: 0.2, delay: 1.2 },
]

const FEATURES = [
  { icon: MapPin, title: 'GIS School Mapping', desc: 'Leaflet maps with GPS capture, verification, and GeoJSON export across Kigali districts.' },
  { icon: BarChart3, title: 'Analytics & Risk Scores', desc: 'National and district dashboards with enrollment trends and intervention priority scoring.' },
  { icon: BellRing, title: 'Resource Alerts', desc: 'Automatic gap detection for textbooks, desks, sanitation, teachers, water, and GPS status.' },
  { icon: MessageSquare, title: 'Issue Threads', desc: 'Community and school feedback with chat-style threads, forward to REB, and reopen workflow.' },
  { icon: FileText, title: 'PDF Decision Reports', desc: 'Role-scoped reports with executive insights — schools, alerts, feedback, enrollment, GPS.' },
  { icon: Users, title: 'Team Chat', desc: 'Category-based group rooms, direct messages, reply-to-message, and member presets.' },
]

const STATS = [
  { v: '35+', l: 'Schools mapped' },
  { v: '2,000+', l: 'Teachers tracked' },
  { v: '3', l: 'Kigali districts' },
]

export default function LandingPage() {
  const [signInOpen, setSignInOpen] = useState(false)

  return (
    <div style={{ minHeight: '100vh', background: '#0B1220', color: '#fff', position: 'relative', overflow: 'hidden' }}>
      <style>{CSS}{`
        @keyframes landFloat {
          0%, 100% { transform: translateY(0) rotate(var(--rot)); }
          50% { transform: translateY(-12px) rotate(var(--rot)); }
        }
        @keyframes landPulse {
          0%, 100% { opacity: var(--o); }
          50% { opacity: calc(var(--o) + 0.08); }
        }
      `}</style>

      {/* Gradient base */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(135deg, #0B1220 0%, #1E3A5F 42%, #0F2847 70%, #0B1220 100%)',
        pointerEvents: 'none',
      }} />

      {/* Aesthetic squares */}
      {SQUARES.map((s, i) => (
        <div
          key={i}
          style={{
            position: 'absolute', width: s.w, height: s.w, borderRadius: 20,
            top: s.t, left: s.l, right: s.r, bottom: s.b,
            background: 'linear-gradient(145deg, rgba(59,130,246,0.45), rgba(6,182,212,0.2))',
            border: '1px solid rgba(147,197,253,0.25)',
            boxShadow: '0 8px 32px rgba(37,99,235,0.15)',
            pointerEvents: 'none', zIndex: 0,
            '--rot': `${s.rot}deg`, '--o': s.o,
            animation: `landFloat ${6 + s.delay}s ease-in-out infinite, landPulse ${4 + s.delay * 0.5}s ease-in-out infinite`,
            animationDelay: `${s.delay}s`,
            opacity: s.o,
          }}
        />
      ))}

      {/* Orbs */}
      <div style={{ position: 'absolute', width: 500, height: 500, top: -120, right: -100, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(37,99,235,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: 400, height: 400, bottom: -80, left: -60, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
        {/* Nav */}
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 0 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg,#2563EB,#06B6D4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Syne', fontWeight: 800, fontSize: 16,
            }}>EC</div>
            <div>
              <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 800 }}>ECRM</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>Rwanda · Resource Mapping</div>
            </div>
          </div>
          <Btn onClick={() => setSignInOpen(true)} style={{ padding: '10px 22px' }}>
            Sign In <ArrowRight size={16} />
          </Btn>
        </header>

        {/* Hero */}
        <section style={{ textAlign: 'center', padding: '48px 0 64px' }}>
          <div style={{
            display: 'inline-block', padding: '6px 14px', borderRadius: 20, marginBottom: 20,
            background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(96,165,250,0.3)',
            fontSize: 12, fontWeight: 600, color: '#93C5FD',
          }}>
            Education Community Resource Mapping
          </div>
          <h1 style={{
            fontFamily: 'Syne', fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 800, lineHeight: 1.15,
            marginBottom: 20, maxWidth: 720, margin: '0 auto 20px',
            background: 'linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.75) 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Map resources. Close gaps. Empower every school in Kigali.
          </h1>
          <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.6)', maxWidth: 560, margin: '0 auto 32px', lineHeight: 1.7 }}>
            Track school infrastructure, teacher workloads, resource gaps, and community feedback
            — all in one place for smarter education planning.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Btn onClick={() => setSignInOpen(true)} style={{ padding: '14px 28px', fontSize: 15 }}>
              Get Started — Sign In
            </Btn>
            <a href="#features" style={{
              padding: '14px 28px', borderRadius: 10, fontSize: 15, fontWeight: 600,
              border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.85)',
              textDecoration: 'none', background: 'rgba(255,255,255,0.05)',
            }}>Explore Features</a>
          </div>
        </section>

        {/* Stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 16,
          marginBottom: 72, padding: '24px', borderRadius: 16,
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(8px)',
        }}>
          {STATS.map(s => (
            <div key={s.l} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'Syne', fontSize: 28, fontWeight: 800, color: '#60A5FA' }}>{s.v}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Features */}
        <section id="features" style={{ marginBottom: 72 }}>
          <h2 style={{ fontFamily: 'Syne', fontSize: 28, fontWeight: 800, marginBottom: 8, textAlign: 'center' }}>Platform Features</h2>
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', marginBottom: 32, fontSize: 14 }}>
            Built for evidence-based decisions across Rwanda&apos;s education sector
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 18 }}>
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} style={{
                padding: 24, borderRadius: 16,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                transition: 'transform 0.2s',
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, marginBottom: 14,
                  background: 'linear-gradient(135deg, rgba(37,99,235,0.3), rgba(6,182,212,0.2))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={22} color="#60A5FA" />
                </div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{title}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65 }}>{desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section style={{
          textAlign: 'center', padding: '48px 32px', marginBottom: 48, borderRadius: 20,
          background: 'linear-gradient(135deg, rgba(37,99,235,0.2), rgba(6,182,212,0.1))',
          border: '1px solid rgba(96,165,250,0.2)',
        }}>
          <h3 style={{ fontFamily: 'Syne', fontSize: 24, fontWeight: 800, marginBottom: 10 }}>Ready to get started?</h3>
          <p style={{ color: 'rgba(255,255,255,0.55)', marginBottom: 24, fontSize: 14 }}>
            Sign in to access your dashboard, maps, reports, and school data.
          </p>
          <Btn onClick={() => setSignInOpen(true)} style={{ padding: '12px 32px' }}>
            Sign In <ArrowRight size={18} />
          </Btn>
        </section>

        <footer style={{ textAlign: 'center', padding: '24px 0 40px', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
          ECRM Rwanda © {new Date().getFullYear()} — Ministry of Education · Kigali City
        </footer>
      </div>

      <SignInModal open={signInOpen} onClose={() => setSignInOpen(false)} />
    </div>
  )
}
