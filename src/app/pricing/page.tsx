import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PricingPlans } from '@/components/billing/pricing-plans';
import styles from '@/components/billing/pricing-plans.module.css';

export const metadata: Metadata = {
  title: 'Plans and pricing — DATUMM',
  description: 'Start with DATUMM Free. Explore planned Pro and Max individual plans for architectural work.',
};

export default function PricingPage() {
  return <div className={styles.publicPage}>
    <header className={styles.publicHeader}>
      <Link href="/" className={styles.brand} aria-label="DATUMM workspace"><img src="/datumm-mark.png" alt="" />DATUMM</Link>
      <Link href="/" className={styles.back}><ArrowLeft size={14} aria-hidden="true" />Back to workspace</Link>
    </header>
    <main className={styles.publicMain}><PricingPlans /></main>
  </div>;
}
