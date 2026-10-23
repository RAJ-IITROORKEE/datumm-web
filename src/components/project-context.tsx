'use client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
export function ProjectContext({open,onOpenChange}:{open:boolean;onOpenChange:(open:boolean)=>void}) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Projects and local files</DialogTitle><DialogDescription>Local project folders, shared Markdown context and source attachments are available in DATUMM Desktop. This web workspace saves conversations and drawings in your hosted account.</DialogDescription></DialogHeader></DialogContent></Dialog>;
}
