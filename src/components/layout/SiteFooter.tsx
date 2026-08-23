import Link from 'next/link';
import { Container } from '@/components/ui';
import { Wordmark } from './Wordmark';
import { SUPPORTED_COUNTRIES } from '@/lib/domain/countries';

const COLUMNS = [
  {
    title: 'Rent',
    links: [
      { href: '/search', label: 'Browse cars' },
      { href: '/search?country=DE', label: 'Cars in Germany' },
      { href: '/search?country=LB', label: 'Cars in Lebanon' },
      { href: '/how-it-works', label: 'How it works' },
      { href: '/protection', label: 'Protection tiers' },
    ],
  },
  {
    title: 'Host',
    links: [
      { href: '/host', label: 'List your car' },
      { href: '/host#earnings', label: 'What you could earn' },
      { href: '/host#approval', label: 'Choosing your renter' },
      { href: '/host#payouts', label: 'Getting paid' },
    ],
  },
  {
    title: 'Trust',
    links: [
      { href: '/protection', label: 'Insurance and excess' },
      { href: '/how-it-works#verification', label: 'Document verification' },
      { href: '/how-it-works#inspection', label: 'Handover inspections' },
      { href: '/legal/terms', label: 'Terms' },
      { href: '/legal/privacy', label: 'Privacy' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="relative mt-32 border-t border-white/[0.07] pt-20 pb-10">
      <Container>
        <div className="grid gap-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Wordmark />
            <p className="mt-5 max-w-xs text-[13.5px] leading-relaxed text-mist">
              A car sitting on a driveway earns nothing. KarRent lets the person who owns it decide
              exactly who drives it, for how much, and on what terms.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {SUPPORTED_COUNTRIES.map((country) => (
                <span
                  key={country.code}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11.5px] text-mist"
                >
                  <span aria-hidden>{country.flag}</span>
                  {country.name}
                  <span className="text-slate-dim">·</span>
                  <span className="numeric">{country.currency}</span>
                </span>
              ))}
            </div>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-dim">
                {column.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[13.5px] text-mist transition-colors hover:text-chalk"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="hairline-x my-10" />

        <div className="flex flex-col gap-4 text-[12px] text-slate-dim sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} KarRent. Built for Germany and Lebanon.</p>
          <p className="max-w-xl leading-relaxed">
            Vehicles listed in Germany carry statutory Kfz-Haftpflichtversicherung. Vehicles listed in
            Lebanon carry compulsory third-party bodily-injury cover; property damage is carried by
            KarRent protection.
          </p>
        </div>
      </Container>
    </footer>
  );
}
