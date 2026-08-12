// components/sections/HeroSection.tsx
import React from 'react';

const heroStats = [
  { label: 'Happy Patients', value: '8k+', accent: 'from-teal-500/40 to-teal-600/60' },
  { label: 'Years of Service', value: '15+', accent: 'from-blue-500/40 to-blue-600/60' }
];

const heroCards = [
  {
    title: 'Working Hours',
    description: 'Mon – Sat • 9:00 AM – 3:00 PM',
    icon: (
      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
          clipRule="evenodd"
        />
      </svg>
    )
  },
  {
    title: 'Book Appointment',
    description: 'Schedule your visit today',
    action: 'contact',
    icon: (
      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
          clipRule="evenodd"
        />
      </svg>
    )
  },
  {
    title: 'Emergency Service',
    description: '24/7 urgent care hotline',
    icon: (
      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
    )
  }
];

const HeroSection: React.FC = () => {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section
      className="relative isolate overflow-hidden text-white"
      style={{
        backgroundImage: 'url("background.jpeg")',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div className="absolute inset-0 bg-slate-900/80 lg:bg-gradient-to-r lg:from-slate-900/90 lg:via-slate-800/75 lg:to-slate-700/60" />

      <div className="relative mx-auto flex min-h-[100vh] flex-col justify-center px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 lg:gap-16">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-center">
            <div className="space-y-8">
              <div className="flex flex-wrap gap-4">
                {heroStats.map((stat) => (
                  <div
                    key={stat.label}
                    className={`rounded-2xl bg-gradient-to-br ${stat.accent} px-5 py-4 shadow-xl backdrop-blur`}
                  >
                    <p className="text-sm uppercase tracking-wider text-white/80">{stat.label}</p>
                    <p className="text-3xl font-bold text-white">{stat.value}</p>
                  </div>
                ))}
              </div>

              <h1 className="text-4xl font-bold leading-tight sm:text-5xl md:text-6xl lg:text-7xl">
                Dental Care For
                <br />
                Your <span className="text-teal-400">NEW</span>
                <br />
                <span className="text-teal-400">SMILE.</span>
              </h1>

              <p className="text-lg text-white/90 sm:text-xl md:text-2xl">
                Experience exceptional dental care with our state-of-the-art technology and compassionate team. Your
                perfect smile awaits.
              </p>

              <div className="flex flex-col gap-4 pt-4 sm:flex-row">
                <button
                  onClick={() => scrollToSection('contact')}
                  className="w-full rounded-xl bg-gradient-to-r from-teal-600 to-blue-600 px-8 py-4 text-lg font-semibold shadow-xl transition hover:from-teal-700 hover:to-blue-700 sm:w-auto"
                >
                  Book Appointment
                </button>
                <button
                  onClick={() => scrollToSection('services')}
                  className="w-full rounded-xl border border-white/30 bg-white/10 px-8 py-4 text-lg font-semibold backdrop-blur transition hover:bg-white/20 sm:w-auto"
                >
                  Learn More
                </button>
              </div>
            </div>

            <div className="rounded-3xl bg-white/10 p-8 shadow-2xl backdrop-blur">
              <p className="text-sm uppercase tracking-widest text-teal-200">Why patients choose us</p>
              <h2 className="mt-4 text-3xl font-bold leading-snug text-white">Comfort, technology & genuine care.</h2>
              <p className="mt-6 text-white/85">
                High-precision equipment, gentle hands, and transparent treatment plans keep you confident at every
                visit—no matter the procedure.
              </p>
              <div className="mt-8 grid gap-4 text-sm text-white/80">
                <p>• Digital diagnostics & 3D imaging</p>
                <p>• Personalized treatment roadmaps</p>
                <p>• Flexible scheduling & payment options</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {heroCards.map((card) => (
              <button
                key={card.title}
                onClick={() => card.action && scrollToSection(card.action)}
                className={`rounded-2xl border border-white/15 bg-black/35 p-6 text-left shadow-2xl transition hover:bg-black/45 ${
                  card.action ? 'cursor-pointer' : 'cursor-default'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">{card.icon}</div>
                  <div className="space-y-1">
                    <p className="text-lg font-semibold text-white">{card.title}</p>
                    <p className="text-sm text-white/80">{card.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;