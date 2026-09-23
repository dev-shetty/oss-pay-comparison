import { useState } from 'react';
import { Check, ImageDown, Link2, Table2 } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface CardActionsProps {
  onCopyLink: () => Promise<void>;
  onSavePng?: () => void;
  onShowTable?: () => void;
}

function IconAction({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<button type="button" className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })} aria-label={label} onClick={onClick} />}>
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function CardActions({ onCopyLink, onSavePng, onShowTable }: CardActionsProps) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await onCopyLink();
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="flex items-center gap-0.5 text-sub">
      <IconAction label={copied ? 'Copied' : 'Copy link'} onClick={() => void copy()}>
        {copied ? <Check className="text-inp" /> : <Link2 />}
      </IconAction>
      {onSavePng && <IconAction label="Save PNG" onClick={onSavePng}><ImageDown /></IconAction>}
      {onShowTable && <IconAction label="Show table" onClick={onShowTable}><Table2 /></IconAction>}
    </div>
  );
}
