'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Check, ChevronDown } from 'lucide-react';
import styles from './pricing-plans.module.css';

const workspaceFeatures = [
  'Ask and Plan conversations',
  '2D and 3D drawing review',
  'Drawing annotations',
  'Reports and answer-table CSV export',
  'Optional Revit connector',
];

const plans = [
  { name: 'Free', price: 0, description: 'Start exploring your architectural workspace.', usage: 'Basic', planned: [] },
  { name: 'Pro', price: 20, description: 'For regular professional design work.', usage: 'Higher', planned: ['Higher usage allowance for professional work'] },
  { name: 'Max', price: 99, description: 'For your heaviest individual workflows.', usage: 'Highest', planned: ['Highest usage allowance for heavy workflows', 'Priority processing'] },
];

/** Product pricing direction only. Paid plans do not confer server entitlements. */
export function PricingPlans({ embedded = false }: { embedded?: boolean }) {
  const [expanded, setExpanded] = useState(true);
  const detailsId = useId();
  const Title = embedded ? 'h2' : 'h1';
  const PlanTitle = embedded ? 'h3' : 'h2';
  return <section className={`${styles.root} ${embedded ? styles.embedded : ''}`} aria-label="DATUMM individual plans">
    <div className={styles.intro}>
      <Title>{embedded ? 'Your plan' : 'Choose your plan'}</Title>
      <p>{embedded ? 'You’re on Free. Pro and Max are planned for individual accounts.' : 'Start on Free. Pro and Max are coming for architects who need more room to work.'}</p>
      <div className={styles.billingPeriod}><span>Monthly pricing</span><span>USD</span></div>
    </div>
    <div className={styles.grid}>
      {plans.map(plan => {
        const free = plan.name === 'Free';
        return <article key={plan.name} className={styles.plan} aria-label={`${plan.name} plan`}>
          <div className={styles.planHeading}><PlanTitle>{plan.name}</PlanTitle><span className={styles.badge}>{free ? embedded ? 'Current plan' : 'Available now' : 'Planned'}</span></div>
          <p className={styles.description}>{plan.description}</p>
          <div className={styles.price}><strong>${plan.price}</strong><span>/ month</span></div>
          <p className={styles.priceNote}>{free ? 'No subscription payment' : 'Planned monthly price'}</p>
          <dl className={styles.usage}><div><dt>Usage level</dt><dd>{plan.usage}{!free && <span> · planned</span>}</dd></div><div><dt>Account</dt><dd>Individual</dd></div></dl>
          {free ? embedded ? <div className={styles.current}><Check size={15} aria-hidden="true" />Your current plan</div> : <Link href="/" className={styles.start}>Start with Free<ArrowUpRight size={15} aria-hidden="true" /></Link> : <button type="button" className={styles.comingSoon} disabled aria-label={`${plan.name} is coming soon`}>Coming soon</button>}
          <div id={`${detailsId}-${plan.name}`} className={styles.features} hidden={!expanded}>
            <div>
              <p className={styles.featureLabel}>Current workspace capabilities</p>
              <ul>{workspaceFeatures.map(feature => <li key={feature}><Check size={14} aria-hidden="true" /><span>{feature}</span></li>)}</ul>
              {!free && <><p className={styles.featureLabel}>Planned for {plan.name}</p><ul>{plan.planned.map(feature => <li key={feature}><span className={styles.plannedMarker} aria-hidden="true" /><span>{feature}</span></li>)}</ul></>}
              <p className={styles.approval}>Revit changes require a connected model and explicit approval on every plan.</p>
            </div>
          </div>
        </article>;
      })}
    </div>
    <button type="button" className={styles.detailsToggle} aria-expanded={expanded} aria-controls={plans.map(plan => `${detailsId}-${plan.name}`).join(' ')} onClick={() => setExpanded(value => !value)}>{expanded ? 'Hide plan details' : 'Show plan details'}<ChevronDown size={14} aria-hidden="true" /></button>
    <div className={styles.notes}>
      <p>Free is the current plan. Paid subscriptions and checkout are not available yet. Pro and Max benefits are planned; usage limits will be published before launch.</p>
      <p>Plans are for individuals. Team accounts are planned for later.</p>
    </div>
  </section>;
}
