#!/bin/bash

# Chart Dependencies Status Check
# Chart.js and react-chartjs-2 are already in package.json and will be installed automatically

echo "Checking chart dependencies status..."

# Check if dependencies are installed
if npm list chart.js react-chartjs-2 &> /dev/null; then
    echo "✅ Chart dependencies are already installed!"
    echo "   - chart.js: $(npm list chart.js --depth=0 2>/dev/null | grep chart.js | awk '{print $2}')"
    echo "   - react-chartjs-2: $(npm list react-chartjs-2 --depth=0 2>/dev/null | grep react-chartjs-2 | awk '{print $2}')"
else
    echo "📦 Installing chart dependencies..."
    npm install
fi

echo ""
echo "🎯 Chart dependencies are ready!"
echo ""
echo "Advanced charts are now available in:"
echo "- src/components/dashboard/EnhancedChartWidget.tsx"
echo "- You can now enable the chart.js imports and components"
echo ""
echo "Note: Dependencies are automatically installed in Docker builds via package.json"
