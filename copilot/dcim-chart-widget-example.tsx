// Example DCIM chart widget integration for React (Nivo)
import { ResponsiveBar } from '@nivo/bar'

export const DCIMStatusBarChart = ({ data }) => (
  <div className="h-64 w-full bg-white rounded shadow p-4">
    <ResponsiveBar
      data={data}
      keys={["active", "offline", "maintenance"]}
      indexBy="location"
      margin={{ top: 20, right: 20, bottom: 40, left: 60 }}
      padding={0.3}
      colors={{ scheme: 'nivo' }}
      axisBottom={{ legend: 'Location', legendPosition: 'middle', legendOffset: 32 }}
      axisLeft={{ legend: 'Count', legendPosition: 'middle', legendOffset: -40 }}
      labelSkipWidth={12}
      labelSkipHeight={12}
      theme={{
        axis: { legend: { text: { fontSize: 14 } } },
        labels: { text: { fontSize: 12 } }
      }}
    />
  </div>
)
