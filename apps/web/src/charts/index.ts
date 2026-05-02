// Chart primitives barrel.
//
// Each chart lives in its own folder with its component, helpers,
// optional sub-components, and colocated tests. Re-exported here so
// consumers do `import { LineChart } from '../../charts'`.

export { Sparkline, type SparklineProps } from './Sparkline/index.js'
export { LineChart, type LineChartProps } from './LineChart/index.js'
export { BarRow, type BarRowProps, type BarRowDatum } from './BarRow/index.js'
export {
  RadialSeasonality,
  type RadialSeasonalityProps,
} from './RadialSeasonality/index.js'
export { Choropleth, type ChoroplethProps } from './Choropleth/index.js'
export {
  HexHeatmap,
  synthesizeHexCells,
  type HexHeatmapProps,
  type HexCell,
} from './HexHeatmap/index.js'
export { RampLegend, type RampLegendProps } from './RampLegend/index.js'
export {
  Leaderboard,
  type LeaderboardProps,
  type LeaderboardRow,
} from './Leaderboard/index.js'
export { DATA_RAMP, rampIndex, rampFill, type DataRamp } from './ramp.js'
