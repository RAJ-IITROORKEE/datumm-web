'use client';
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {CANVAS_NAVIGATION_HELP,CANVAS_SHORTCUTS} from '@/lib/canvas-shortcuts.mjs';

/** Radix Dialog supplies the focus trap, Escape and focus return to whatever opened it. */
export function CanvasShortcutHelp({open,onOpenChange}:{open:boolean;onOpenChange:(open:boolean)=>void}){
 return <Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="sm:max-w-sm">
   <DialogHeader><DialogTitle>Keyboard shortcuts</DialogTitle><DialogDescription>Active while the drawing area has focus.</DialogDescription></DialogHeader>
   <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-2 text-sm">
    {CANVAS_SHORTCUTS.map(row=><div key={row.action} className="contents"><dt>{row.label}</dt><dd className="m-0"><kbd>{row.keys}</kbd></dd></div>)}
   </dl>
   <p className="m-0 text-xs">{CANVAS_NAVIGATION_HELP}</p>
  </DialogContent>
 </Dialog>;
}
