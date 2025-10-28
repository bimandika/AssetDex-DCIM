import { ReportMetrics } from '@/hooks/useReportMetrics';

export class ReportExporter {
  // Export all charts as images
  static async exportAllCharts(reportType: string) {
    try {
      // Dynamically import html2canvas
      const html2canvas = (await import('html2canvas')).default;
      
      // Find all chart containers
      const chartElements = document.querySelectorAll('[data-chart-id]');
      
      if (chartElements.length === 0) {
        throw new Error('No charts found to export');
      }

      // Create a container for all charts
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.backgroundColor = 'white';
      container.style.padding = '40px';
      container.style.width = '1200px';
      document.body.appendChild(container);

      // Add title
      const title = document.createElement('h1');
      title.textContent = `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`;
      title.style.fontSize = '24px';
      title.style.fontWeight = 'bold';
      title.style.marginBottom = '10px';
      title.style.color = '#1e293b';
      container.appendChild(title);

      // Add date
      const date = document.createElement('p');
      date.textContent = `Generated: ${new Date().toLocaleString()}`;
      date.style.fontSize = '14px';
      date.style.color = '#64748b';
      date.style.marginBottom = '30px';
      container.appendChild(date);

      // Clone each chart
      for (let i = 0; i < chartElements.length; i++) {
        const chartElement = chartElements[i] as HTMLElement;
        const clone = chartElement.cloneNode(true) as HTMLElement;
        clone.style.marginBottom = '30px';
        clone.style.pageBreakInside = 'avoid';
        container.appendChild(clone);
      }

      // Wait for charts to render
      await new Promise(resolve => setTimeout(resolve, 500));

      // Capture the container as image
      const canvas = await html2canvas(container, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true
      });

      // Clean up
      document.body.removeChild(container);

      // Download the image
      canvas.toBlob((blob: Blob | null) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${reportType}-all-charts-${new Date().toISOString().split('T')[0]}.png`;
          link.click();
          URL.revokeObjectURL(url);
        }
      });
    } catch (error) {
      console.error('Chart export error:', error);
      throw new Error('Failed to export charts. Make sure html2canvas is installed.');
    }
  }
  // Export to CSV
  static async exportToCSV(data: any[], filename: string) {
    // Simple CSV generation without external dependencies
    if (!data || data.length === 0) {
      throw new Error('No data to export');
    }

    // Get headers from first object
    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');

    // Convert data to CSV rows
    const csvRows = data.map(row => {
      return headers.map(header => {
        const value = row[header];
        // Handle values with commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join(',');
    });

    const csv = [csvHeaders, ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  // Export to JSON
  static async exportToJSON(data: any, filename: string) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  // Export to Excel (using SheetJS if available, otherwise CSV)
  static async exportToExcel(data: any[], filename: string) {
    try {
      // Try to import xlsx dynamically
      const XLSX = await import('xlsx');
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
      XLSX.writeFile(workbook, `${filename}-${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      // Fallback to CSV if xlsx is not available
      console.warn('xlsx not available, falling back to CSV');
      await this.exportToCSV(data, filename);
    }
  }

  // Export report data based on format
  static async exportReport(
    metrics: ReportMetrics | null,
    reportType: string,
    format: 'csv' | 'xlsx' | 'pdf' | 'json'
  ) {
    if (!metrics) {
      throw new Error('No data to export');
    }

    const filename = `${reportType}-report`;

    switch (format) {
      case 'json':
        await this.exportToJSON(metrics, filename);
        break;

      case 'csv':
        // Flatten data for CSV export
        const csvData = this.flattenReportData(metrics, reportType);
        await this.exportToCSV(csvData, filename);
        break;

      case 'xlsx':
        const excelData = this.flattenReportData(metrics, reportType);
        await this.exportToExcel(excelData, filename);
        break;

      case 'pdf':
        await this.exportToPDF(metrics, reportType);
        break;

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  // Flatten report data for CSV/Excel export
  private static flattenReportData(metrics: ReportMetrics, reportType: string): any[] {
    let data: any[] = [];

    if (reportType === 'activity' && metrics.activityLogs) {
      // Activity logs export
      data = metrics.activityLogs.map(log => ({
        Timestamp: new Date(log.created_at).toLocaleString(),
        User: log.user_name || log.user_email,
        Email: log.user_email,
        Action: log.action_type,
        EntityType: log.entity_type,
        EntityID: log.entity_id,
        Changes: JSON.stringify(log.changes)
      }));
    } else {
      // Standard reports export
      if (metrics.serversByModel && metrics.serversByModel.length > 0) {
        data = metrics.serversByModel.map(item => ({
          Model: item.model,
          Count: item.count,
          Percentage: `${item.percentage}%`
        }));
      } else if (metrics.serversByStatus && metrics.serversByStatus.length > 0) {
        data = metrics.serversByStatus.map(item => ({
          Status: item.status,
          Count: item.count
        }));
      } else if (metrics.utilizationByDataCenter && metrics.utilizationByDataCenter.length > 0) {
        data = metrics.utilizationByDataCenter.map(item => ({
          DataCenter: item.dataCenter,
          Servers: item.servers,
          Capacity: item.capacity,
          Utilization: `${item.utilization}%`
        }));
      } else if (metrics.warrantyExpiration && metrics.warrantyExpiration.length > 0) {
        data = metrics.warrantyExpiration.map(item => ({
          Month: item.month,
          Expiring: item.expiring
        }));
      }
    }

    return data;
  }

  // Export to PDF (basic implementation)
  static async exportToPDF(metrics: ReportMetrics, reportType: string) {
    try {
      // Try to use jsPDF if available
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();

      // Title
      doc.setFontSize(18);
      doc.text(`${reportType.toUpperCase()} Report`, 14, 22);

      // Date
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);

      // Summary
      doc.setFontSize(12);
      let yPosition = 40;

      if (reportType === 'activity') {
        doc.text('Activity Summary:', 14, yPosition);
        yPosition += 10;
        doc.setFontSize(10);
        doc.text(`Total Activities: ${metrics.totalActivities || 0}`, 20, yPosition);
        yPosition += 7;
        doc.text(`Active Users: ${metrics.activityByUser?.length || 0}`, 20, yPosition);
        yPosition += 7;
        doc.text(`Action Types: ${metrics.activityByType?.length || 0}`, 20, yPosition);
      } else {
        doc.text('Report Summary:', 14, yPosition);
        yPosition += 10;
        doc.setFontSize(10);
        doc.text(`Total Servers: ${metrics.totalServers || 0}`, 20, yPosition);
        yPosition += 7;
        doc.text(`Generated: ${metrics.lastUpdated}`, 20, yPosition);
      }

      // Save the PDF
      doc.save(`${reportType}-report-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      // Fallback to JSON if jsPDF is not available
      console.warn('jsPDF not available, falling back to JSON');
      await this.exportToJSON(metrics, `${reportType}-report`);
    }
  }
}
