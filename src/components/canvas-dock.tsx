'use client';
import type {ComponentProps} from 'react';
import {Separator} from '@/components/ui/separator';
import {Tooltip,TooltipContent,TooltipProvider,TooltipTrigger} from '@/components/ui/tooltip';
import {cn} from '@/lib/utils';
import styles from './canvas-dock.module.css';

/** The one floating bar of canvas controls. Overflow scrolls sideways instead of covering the drawing. */
export function CanvasDock({children}:{children:React.ReactNode}){
 return <TooltipProvider delayDuration={400}><div className={styles.dock} role="toolbar" aria-label="Canvas tools">{children}</div></TooltipProvider>;
}

/** Icon button with a tooltip; pass `aria-label` for the accessible name and `tip` for the visible hint. */
export function DockButton({tip,className,children,...props}:ComponentProps<'button'>&{tip:string}){
 return <Tooltip><TooltipTrigger asChild><button type="button" className={cn(styles.btn,className)} {...props}>{children}</button></TooltipTrigger><TooltipContent side="top" sideOffset={8}>{tip}</TooltipContent></Tooltip>;
}

export function DockSep(){return <Separator orientation="vertical" className={styles.sep}/>;}
