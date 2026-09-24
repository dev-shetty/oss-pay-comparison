import { useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { CardActions } from './CardActions';
import { Chart, type ChartHandle } from './Chart';
import { ChartLegend } from './ChartLegend';
import { RangeGuide } from './RangeGuide';
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

interface ChartBodyProps {
  spec: ChartSpec;
  chartRef: React.RefObject<ChartHandle>;
  height: number | string;
  present: boolean;
  onClickName?: (name: string) => void;
}

function ChartBody({ spec, chartRef, height, present, onClickName }: ChartBodyProps) {
  if (spec.option) return <Chart ref={chartRef} option={spec.option} height={height} onClickName={onClickName} />;
  return (
    <div style={{ height }} className="flex flex-col items-center justify-center rounded-lg bg-muted text-sub">
      <p className={`${present ? 'text-2xl' : 'text-base'} font-bold`}>Not pulled yet</p>
      <p className={`${present ? 'text-lg' : 'text-sm'} mt-1 max-w-md text-center`}>{spec.missing}</p>
      <img src={WATERMARK} alt="Levels.fyi" className="absolute right-6 bottom-2 h-5 opacity-60" />
    </div>
  );
}

export function ChartCard({ id, title, ctx, build, present, height, controls, onClickName }: ChartCardProps) {
  const chartRef = useRef<ChartHandle>(null);
  const [tableOpen, setTableOpen] = useState(false);
  const [hidden, setHidden] = useState<Bucket[]>([]);
  const spec = useMemo(() => build({ ...ctx, visible: ctx.visible.filter(b => !hidden.includes(b)) }), [build, ctx, hidden]);
  const legendBuckets = ctx.visible.filter(b => spec.legend?.includes(b) || hidden.includes(b));
  const toggleBucket = (b: Bucket) => setHidden(prev => (prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b]));
  const missing = spec.option === null;
  const chartHeight = present ? '100%' : spec.height ?? height;
  const titleClass = present ? 'text-[2.4rem] leading-tight font-extrabold' : 'text-xl leading-tight font-extrabold';
  const contextClass = present ? 'text-lg' : 'text-xs';
  return (
    <Card id={id} className={`scroll-mt-40 shadow-card ring-0 ${present ? 'h-full' : ''} ${missing ? 'opacity-70' : ''}`}>
      <CardHeader className="gap-1 border-b border-border pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <p className={`${contextClass} mb-1 font-bold text-mute`}>{spec.context}</p>
            <h2 className={`${titleClass} text-ink text-balance`}>{title}</h2>
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
      <CardContent className={`relative flex flex-col ${present ? 'min-h-0 flex-1 gap-2 pt-3' : 'gap-3 pt-4'}`}>
        <ChartLegend buckets={legendBuckets} hidden={hidden} items={spec.key} help={spec.help} present={present} onToggle={toggleBucket} />
        {spec.guide && !(present && spec.guide === 'tick') && <RangeGuide present={present} mark={spec.guide} />}
        <div className={present ? 'relative min-h-0 flex-1' : ''}>
          <div className={present ? 'absolute inset-0' : ''}>
            <ChartBody spec={spec} chartRef={chartRef} height={chartHeight} present={present} onClickName={onClickName} />
          </div>
        </div>
        <p className={`${present ? 'text-base' : 'text-xs'} shrink-0 text-mute pr-28`}>{spec.source}</p>
      </CardContent>
      {!missing && (
        <DataTableDialog open={tableOpen} onOpenChange={setTableOpen} title={title} source={spec.source} table={spec.table} />
      )}
    </Card>
  );
}
