import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

/**
 * Gráfica de área naranja estilo Harbiz (cargada con React.lazy para no penalizar el bundle inicial).
 */
export default function HarbizAreaChart({
  data = [],
  dataKey = 'valor',
  xKey = 'etiqueta',
  unit = 'kg',
  height = 185,
}) {
  if (!data || data.length === 0) {
    return (
      <div
        style={{ height }}
        className="w-full flex items-center justify-center text-xs text-[#9CA3AF] border border-dashed border-[#E5E7EB] rounded-2xl bg-[#FAFAFB]"
      >
        Aún no hay suficientes registros para mostrar la gráfica
      </div>
    )
  }

  // Si solo hay 1 punto, duplicamos visualmente para que AreaChart dibuje el área limpia
  const chartData =
    data.length === 1
      ? [data[0], { ...data[0], [xKey]: `${data[0][xKey]} ` }]
      : data

  const gradId = `harbizAreaGrad_${dataKey}`

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 8, right: 10, left: -18, bottom: 0 }}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#EE6B2F" stopOpacity={0.88} />
              <stop offset="95%" stopColor="#F5935B" stopOpacity={0.62} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="2 3"
            vertical={false}
            stroke="#ECEEF2"
          />
          <XAxis
            dataKey={xKey}
            stroke="#9CA3AF"
            fontSize={10}
            tickLine={false}
            axisLine={{ stroke: '#D1D5DB' }}
          />
          <YAxis
            stroke="#9CA3AF"
            fontSize={10}
            tickLine={false}
            axisLine={{ stroke: '#D1D5DB' }}
            domain={['dataMin - 1', 'dataMax + 1']}
            tickFormatter={(v) => `${Math.round(v * 10) / 10}${unit}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFFFFF',
              borderColor: '#E5E7EB',
              borderRadius: '12px',
              fontSize: '12px',
              boxShadow: '0 8px 24px rgba(30, 36, 51, 0.08)',
              color: '#1E2433',
            }}
            formatter={(val) => [`${val} ${unit}`, 'Valor']}
          />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke="#DC5A1E"
            strokeWidth={2}
            fillOpacity={1}
            fill={`url(#${gradId})`}
            dot={{
              r: 3.5,
              fill: '#FFFFFF',
              stroke: '#1E2433',
              strokeWidth: 1.5,
            }}
            activeDot={{
              r: 5,
              fill: '#EE6B2F',
              stroke: '#FFFFFF',
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
