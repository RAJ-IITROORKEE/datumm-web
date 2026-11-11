import { PluginSection } from '@/components/admin/data-sections';
import release from '../../../../public/downloads/release.json';
export default function Page() { return <PluginSection release={release} />; }
