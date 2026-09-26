import { useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { CardActions } from './CardActions';
import { Chart, type ChartHandle } from './Chart';
import { ChartLegend } from './ChartLegend';
import { DataTableDialog } from './DataTableDialog';
import type { ChartContext, ChartSpec } from './charts/shared';
import { copyCardLink } from '@/lib/cardLink';
import type { Bucket } from '@/lib/types';
import { WATERMARK } from '@/lib/theme';
import { SLIDE } from '@/lib/slide';

interface ChartCardProps {
  id: string;
  title: string;
  ctx: ChartContext;
  build: (ctx: ChartContext) => ChartSpec;
  present: boolean;
  height: number | string;
  controls?: React.ReactNode;
  onClickName?: (name: string) => void;
  takeaways?: string[];
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

/** Phone-width value axes keep three ticks; the default five run into each other. A fixed max needs an explicit step, since ECharts rounds splitNumber back to its nice interval. */
function withFewerTicks(spec: ChartSpec): ChartSpec {
  if (!spec.option) return spec;
  const thin = (axis: unknown) => {
    const a = axis as { type?: string; max?: unknown };
    if (a.type !== 'value') return axis;
    return typeof a.max === 'number' ? { ...a, interval: a.max / 2 } : { ...a, splitNumber: 3 };
  };
  const { xAxis } = spec.option;
  if (!xAxis) return spec;
  return { ...spec, option: { ...spec.option, xAxis: Array.isArray(xAxis) ? xAxis.map(thin) : thin(xAxis) } as ChartSpec['option'] };
}

interface ChartBodyProps {
  spec: ChartSpec;
  chartRef: React.RefObject<ChartHandle>;
  height: number | string;
  present: boolean;
  onClickName?: (name: string) => void;
  takeaways?: string[];
}

function ChartBody({ spec, chartRef, height, present, onClickName }: ChartBodyProps) {
  if (spec.option) return <Chart ref={chartRef} option={spec.option} height={height} onClickName={onClickName} />;
  return (
    <div style={{ height }} className="flex flex-col items-center justify-center rounded-lg bg-muted text-sub">
      <p className={`${present ? 'text-2xl' : 'text-base'} font-bold`}>Nothing to show</p>
      <p className={`${present ? 'text-lg' : 'text-sm'} mt-1 max-w-md text-center`}>{spec.missing}</p>
      <img src={WATERMARK} alt="Levels.fyi" className="absolute right-6 bottom-2 h-5 opacity-60" />
    </div>
  );
}

export function ChartCard({ id, title, ctx, build, present, height, controls, onClickName, takeaways }: ChartCardProps) {
  const chartRef = useRef<ChartHandle>(null);
  const [tableOpen, setTableOpen] = useState(false);
  const [hidden, setHidden] = useState<Bucket[]>([]);
  const spec = useMemo(() => {
    const built = build({ ...ctx, visible: ctx.visible.filter(b => !hidden.includes(b)) });
    return ctx.narrow ? withFewerTicks(built) : built;
  }, [build, ctx, hidden]);
  const legendBuckets = ctx.visible.filter(b => spec.legend?.includes(b) || hidden.includes(b));
  const toggleBucket = (b: Bucket) => setHidden(prev => (prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b]));
  const missing = spec.option === null;
  const chartHeight = present ? '100%' : spec.height ?? height;
  const titleClass = present ? SLIDE.title : 'text-xl leading-tight font-extrabold';
  const contextClass = present ? SLIDE.eyebrow : 'mb-1 text-xs font-bold text-mute';
  return (
    <Card id={id} className={`scroll-mt-40 shadow-card ring-0 ${present ? SLIDE.card : ''} ${missing ? 'opacity-70' : ''}`}>
      <CardHeader className={present ? SLIDE.header : 'gap-1 border-b border-border pb-3'}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <p className={contextClass}>{spec.context}</p>
            <h2 className={`${titleClass} text-ink text-balance`}>{title}</h2>
            {takeaways && (
              <ul className={`flex flex-col ${present ? `mt-3 max-w-[70ch] gap-1 ${SLIDE.takeaway}` : 'mt-2 gap-1 text-sm font-semibold text-sub'}`}>
                {takeaways.map(t => <li key={t}>{t}</li>)}
              </ul>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-4">
            {controls}
            {!present && (
              <CardActions
                onCopyLink={() => copyCardLink(id)}
                onSavePng={missing ? undefined : () => savePng(chartRef.current, `oss-pay-${id}`)}
                onShowTable={missing ? undefined : () => setTableOpen(true)}
              />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className={`relative flex flex-col ${present ? `min-h-0 flex-1 gap-4 pt-1 pb-8 ${SLIDE.content}` : 'gap-3 pt-4'}`}>
        <ChartLegend buckets={legendBuckets} hidden={hidden} items={spec.key} present={present} onToggle={toggleBucket} />
        <div className={present ? 'relative min-h-0 flex-1' : ''}>
          <div className={present ? 'absolute inset-0' : ''}>
            <ChartBody spec={spec} chartRef={chartRef} height={chartHeight} present={present} onClickName={onClickName} />
          </div>
        </div>
        <p className={`shrink-0 text-mute ${present ? 'border-t border-border pt-4 text-[15px] leading-snug' : 'pr-28 text-xs'}`}>{spec.source}</p>
      </CardContent>
      {!missing && (
        <DataTableDialog open={tableOpen} onOpenChange={setTableOpen} title={title} source={spec.source} table={spec.table} />
      )}
    </Card>
  );
}
