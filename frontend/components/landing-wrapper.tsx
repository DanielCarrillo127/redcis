'use client';

import dynamic from 'next/dynamic';

const LandingClient = dynamic(
  () => import('@/components/landing-client').then((m) => m.LandingClient),
  { ssr: false }
);

export function LandingWrapper() {
  return <LandingClient />;
}
