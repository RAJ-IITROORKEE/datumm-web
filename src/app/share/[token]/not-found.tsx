import styles from '@/components/billing/pricing-plans.module.css';

export default function ShareNotFound() {
  return (
    <main className={styles.sharePage}>
      <h1>This shared chat is not available</h1>
      <p>The link may have been stopped by its owner or is mistyped.</p>
      <footer>Made with <a href="/">DATUMM</a></footer>
    </main>
  );
}
