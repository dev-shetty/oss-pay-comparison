import * as echarts from 'echarts/core';
import { BarChart, CustomChart, LineChart, ScatterChart } from 'echarts/charts';
import { GraphicComponent, GridComponent, LegendComponent, MarkLineComponent, TitleComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([BarChart, LineChart, ScatterChart, CustomChart, GridComponent, LegendComponent, TooltipComponent, GraphicComponent, MarkLineComponent, TitleComponent, CanvasRenderer]);

export { echarts };
