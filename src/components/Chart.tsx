import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import type { EChartsOption, EChartsType } from 'echarts';
import { echarts } from '@/lib/echarts';

export interface ChartHandle {
  instance: () => EChartsType | undefined;
}

interface ChartProps {
  option: EChartsOption;
  height: number | string;
  onClickName?: (name: string) => void;
}

interface ClickParams {
  componentType?: string;
  value?: unknown;
  data?: { row?: { id: string } };
}

// Merge mode keeps update animations; replacing series drops the ones a hidden bucket leaves behind.
const REPLACE_MERGE = ['series'];

function nameFromEvent(params: ClickParams): string | undefined {
  if (params.componentType === 'yAxis' && typeof params.value === 'string') return params.value;
  return params.data?.row?.id;
}

export const Chart = forwardRef<ChartHandle, ChartProps>(function Chart({ option, height, onClickName }, ref) {
  const inner = useRef<ReactEChartsCore>(null);
  const clickRef = useRef(onClickName);
  clickRef.current = onClickName;
  useImperativeHandle(ref, () => ({ instance: () => inner.current?.getEchartsInstance() }), []);
  // echarts-for-react rebinds listeners whenever the onEvents object changes, so keep it stable.
  const onEvents = useMemo(() => ({
    click: (params: ClickParams) => {
      const name = nameFromEvent(params);
      if (name && clickRef.current) clickRef.current(name);
    },
  }), []);
  // The Present frame can grow after mount (height cap lifted per slide); echarts-for-react misses that resize.
  useEffect(() => {
    const el = inner.current?.ele;
    if (!el) return;
    const observer = new ResizeObserver(() => inner.current?.getEchartsInstance().resize());
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <ReactEChartsCore
      ref={inner}
      echarts={echarts}
      option={option}
      lazyUpdate
      replaceMerge={REPLACE_MERGE}
      style={{ height, width: '100%' }}
      onEvents={onEvents}
    />
  );
});
