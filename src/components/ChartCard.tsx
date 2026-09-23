import { useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { CardActions } from './CardActions';
import { Chart, type ChartHandle } from './Chart';
import { ChartLegend } from './ChartLegend';
import { HelpPopover } from './HelpPopover';
import { DataTableDialog } from './DataTableDialog';
import type { ChartContext, ChartSpec } from './charts/shared';
import type { Bucket } from '@/lib/types';
import { WATERMARK } from '@/lib/theme';

interface ChartCardProps {
  id: string;
  title: string;
  ctx: ChartContext;
  build: (ctx: ChartContext) => ChartSpec;
  present: boolean;
  height: number | string;
  controls?: React.ReactNode;
  onClickName?: (name: string) => void;
}

function cardLink(id: string): string {
  return `${window.location.origin}${window.location.pathname}${window.location.search}#${id}`;
}

function savePng(handle: ChartHandle | null, filename: string) {
  const instance = handle?.instance();
  if (!instance) return;
  const url = instance.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#ffffff' });
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.png`;
  a.click();
}

export function ChartCard({ id, title, ctx, build, present, height, controls, onClickName }: ChartCardProps) {
  const chartRef = useRef<ChartHandle>(null);
  const [tableOpen, setTableOpen] = useState(false);
  const [hidden, setHidden] = useState<Bucket[]>([]);
  const spec = useMemo(() => build({ ...ctx, visible: ctx.visible.filter(b => !hidden.includes(b)) }), [build, ctx, hidden]);
  const legendBuckets = ctx.visible.filter(b => spec.legend?.includes(b) || hidden.includes(b));
  const toggleBucket = (b: Bucket) => setHidden(prev => (prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b]));
  const missing = spec.option === null;
  const chartHeight = present ? height : spec.height ?? height;
  const titleClass = present ? 'text-[2.4rem] leading-tight font-extrabold' : 'text-xl leading-tight font-extrabold';
  const subClass = present ? 'text-lg' : 'text-[13px] font-semibold';
  return (
    <Card id={id} className={`scroll-mt-40 shadow-card ring-0 ${missing ? 'opacity-70' : ''}`}>
      <CardHeader className="gap-1 border-b border-border pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className={`${titleClass} text-ink truncate`}>{title}</h2>
            <div className={`${subClass} text-mute mt-1 flex items-center gap-1.5`}>
              <span className="truncate">{spec.subtitle}</span>
              {spec.help && <HelpPopover lines={spec.help} present={present} />}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-4">
            {controls}
            {!present && (
              <CardActions
                onCopyLink={() => navigator.clipboard.writeText(cardLink(id))}
                onSavePng={missing ? undefined : () => savePng(chartRef.current, `oss-pay-${id}`)}
                onShowTable={missing ? undefined : () => setTableOpen(true)}
              />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative flex flex-col gap-3 pt-4">
        <ChartLegend buckets={legendBuckets} hidden={hidden} present={present} onToggle={toggleBucket} />
        {spec.option ? (
          <Chart ref={chartRef} option={spec.option} height={chartHeight} onClickName={onClickName} />
        ) : (
          <div style={{ height: chartHeight }} className="flex flex-col items-center justify-center rounded-lg bg-muted text-sub">
            <p className={`${present ? 'text-2xl' : 'text-base'} font-bold`}>Not pulled yet</p>
            <p className={`${present ? 'text-lg' : 'text-sm'} mt-1 max-w-md text-center`}>{spec.missing}</p>
            <img src={WATERMARK} alt="Levels.fyi" className="absolute right-6 bottom-2 h-5 opacity-60" />
          </div>
        )}
        <p className={`${present ? 'text-base' : 'text-xs'} text-mute truncate pr-28`}>{spec.source}</p>
      </CardContent>
      {!missing && (
        <DataTableDialog open={tableOpen} onOpenChange={setTableOpen} title={title} source={spec.source} table={spec.table} />
      )}
    </Card>
  );
}
