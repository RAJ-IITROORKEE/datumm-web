import type { DesktopApi } from '@/lib/desktop-contract';

declare global {
  interface Window { desktop?: DesktopApi }
}
