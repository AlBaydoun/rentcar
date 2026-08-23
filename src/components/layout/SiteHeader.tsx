'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ButtonLink } from '@/components/ui';
import { Wordmark } from './Wordmark';

const NAV = [
  { href: '/search', label: 'Find a car' },
  { href: '/host', label: 'Rent out your car' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/protection', label: 'Protection' },
];

export function SiteHeader({
  user,
}: {
  user?: { fullName: string; role: string } | null;
}) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-40 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]',
          scrolled ? 'py-2.5' : 'py-4',
        )}
      >
        <div className="mx-auto w-full max-w-[1240px] px-5 sm:px-8">
          <div
            className={cn(
              'flex items-center justify-between gap-6 rounded-xl px-4 transition-all duration-500',
              scrolled
                ? 'panel panel-lit h-14 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.9)]'
                : 'h-16 border border-transparent',
            )}
          >
            <Link href="/" className="shrink-0" aria-label="KarRent home">
              <Wordmark />
            </Link>

            <nav className="hidden items-center gap-1 lg:flex">
              {NAV.map((item) => {
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'relative rounded-[10px] px-3.5 py-2 text-[13.5px] font-medium transition-colors',
                      active ? 'text-chalk' : 'text-mist hover:text-chalk',
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="nav-active"
                        className="absolute inset-0 rounded-[10px] bg-white/[0.07]"
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      />
                    )}
                    <span className="relative">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-2">
              {user ? (
                <ButtonLink
                  href={user.role === 'ADMIN' ? '/admin' : '/dashboard'}
                  variant="secondary"
                  size="sm"
                  className="hidden sm:inline-flex"
                >
                  {user.fullName.split(' ')[0]}
                </ButtonLink>
              ) : (
                <ButtonLink href="/signin" variant="ghost" size="sm" className="hidden sm:inline-flex">
                  Sign in
                </ButtonLink>
              )}
              <ButtonLink href="/search" size="sm" className="hidden sm:inline-flex">
                Browse cars
              </ButtonLink>
              <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                className="grid h-10 w-10 place-items-center rounded-[10px] text-mist transition-colors hover:bg-white/[0.06] hover:text-chalk lg:hidden"
                aria-label={open ? 'Close menu' : 'Open menu'}
                aria-expanded={open}
              >
                {open ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-ink-950/85 backdrop-blur-xl lg:hidden"
          >
            <motion.nav
              initial={{ y: -18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -18, opacity: 0 }}
              transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
              className="flex h-full flex-col justify-center gap-1 px-8"
            >
              {NAV.map((item, index) => (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.06 + index * 0.05 }}
                >
                  <Link
                    href={item.href}
                    className="display block py-3 text-3xl text-chalk transition-colors hover:text-amber-400"
                  >
                    {item.label}
                  </Link>
                </motion.div>
              ))}
              <div className="mt-8 flex gap-3">
                <ButtonLink href={user ? '/dashboard' : '/signin'} variant="secondary" size="lg">
                  {user ? 'Dashboard' : 'Sign in'}
                </ButtonLink>
                <ButtonLink href="/search" size="lg">
                  Browse cars
                </ButtonLink>
              </div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
