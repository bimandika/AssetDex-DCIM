import { ReportMetrics } from '@/hooks/useReportMetrics';

export class ReportExporter {
  // Export all reports with pre-captured chart images and tables as PDF
  static async exportAllReportsWithImages(
    allReportsData: Record<string, ReportMetrics | null>,
    allChartImages: Record<string, string[]>
  ) {
    try {
      // Dynamically import required libraries
      const jsPDF = (await import('jspdf')).default;
      const autoTable = (await import('jspdf-autotable')).default;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;

      // Title Page
      pdf.setFontSize(28);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(15, 23, 42);
      pdf.text('Complete Reports & Analytics', pageWidth / 2, 50, { align: 'center' });
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 116, 139);
      pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 60, { align: 'center' });
      
      // Add a decorative line
      pdf.setDrawColor(59, 130, 246);
      pdf.setLineWidth(1);
      pdf.line(margin, 70, pageWidth - margin, 70);

      const reportTypes = ['inventory', 'warranty', 'utilization', 'maintenance', 'activity'];
      const reportTitles: Record<string, string> = {
        inventory: 'Inventory Summary Report',
        warranty: 'Warranty Status Report',
        utilization: 'Resource Utilization Report',
        maintenance: 'Maintenance Overview Report',
        activity: 'Activity & Logs Report'
      };

      for (const reportType of reportTypes) {
        const metrics = allReportsData[reportType];
        const chartImages = allChartImages[reportType] || [];
        
        // Add new page for each report
        pdf.addPage();
        let currentY = 20;

        // Report Section Title with background
        pdf.setFillColor(241, 245, 249);
        pdf.roundedRect(margin, currentY - 8, pageWidth - (2 * margin), 15, 3, 3, 'F');
        
        pdf.setFillColor(59, 130, 246);
        pdf.rect(margin + 3, currentY - 6, 4, 11, 'F');
        
        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(15, 23, 42);
        pdf.text(reportTitles[reportType], margin + 10, currentY);
        currentY += 20;

        // Charts Section
        if (chartImages.length > 0) {
          pdf.setFontSize(14);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(30, 41, 59);
          pdf.text('Visual Charts', margin, currentY);
          currentY += 10;

          const chartsPerRow = 2;
          const maxChartWidth = (pageWidth - (3 * margin)) / 2;
          const maxChartHeight = 80; // Increased max height for better proportion
          let chartX = margin;
          let chartCount = 0;
          let rowMaxHeight = 0;

          for (const imgData of chartImages) {
            try {
              // Create a temporary image to get actual dimensions
              const tempImg = new Image();
              
              // Wait for image to load to get accurate dimensions
              await new Promise((resolve, reject) => {
                tempImg.onload = resolve;
                tempImg.onerror = reject;
                tempImg.src = imgData;
              });
              
              // Calculate proportional dimensions based on actual image size
              const originalWidth = tempImg.naturalWidth || tempImg.width;
              const originalHeight = tempImg.naturalHeight || tempImg.height;
              
              let chartWidth = maxChartWidth;
              let chartHeight = maxChartHeight;
              
              // Calculate proper aspect ratio if we have valid dimensions
              if (originalWidth > 0 && originalHeight > 0) {
                const aspectRatio = originalWidth / originalHeight;
                
                // Always maintain aspect ratio - fit within bounds
                if (aspectRatio > (maxChartWidth / maxChartHeight)) {
                  // Image is wider - constrain by width
                  chartWidth = maxChartWidth;
                  chartHeight = maxChartWidth / aspectRatio;
                } else {
                  // Image is taller - constrain by height  
                  chartHeight = maxChartHeight;
                  chartWidth = maxChartHeight * aspectRatio;
                }
                
                // Ensure minimum sizes for readability
                chartWidth = Math.max(chartWidth, 200);
                chartHeight = Math.max(chartHeight, 150);
                
                // But don't exceed maximum bounds
                if (chartWidth > maxChartWidth) {
                  chartWidth = maxChartWidth;
                  chartHeight = maxChartWidth / aspectRatio;
                }
                if (chartHeight > maxChartHeight) {
                  chartHeight = maxChartHeight;
                  chartWidth = maxChartHeight * aspectRatio;
                }
              }

              // Check if we need a new page
              if (currentY + maxChartHeight > pageHeight - margin) {
                pdf.addPage();
                currentY = 20;
                chartX = margin;
                chartCount = 0;
                rowMaxHeight = 0;
              }

              // Center the chart in its allocated space
              const chartCenterX = chartX + (maxChartWidth - chartWidth) / 2;
              const chartCenterY = currentY + (maxChartHeight - chartHeight) / 2;

              // Add border around chart with proper dimensions
              pdf.setDrawColor(203, 213, 225);
              pdf.setLineWidth(0.3);
              pdf.roundedRect(chartCenterX - 2, chartCenterY - 2, chartWidth + 4, chartHeight + 4, 2, 2, 'S');
              
              // Add image with proper proportions - this is key!
              pdf.addImage(imgData, 'JPEG', chartCenterX, chartCenterY, chartWidth, chartHeight);
              
              rowMaxHeight = Math.max(rowMaxHeight, chartHeight);
              chartCount++;
              
              if (chartCount % chartsPerRow === 0) {
                chartX = margin;
                currentY += maxChartHeight + 12;
                rowMaxHeight = 0;
              } else {
                chartX += maxChartWidth + margin;
              }
            } catch (err) {
              console.error('Error adding chart image:', err);
              // Fallback to original sizing if error
              const fallbackWidth = maxChartWidth * 0.8;
              const fallbackHeight = maxChartHeight * 0.8;
              
              if (currentY + fallbackHeight > pageHeight - margin) {
                pdf.addPage();
                currentY = 20;
                chartX = margin;
                chartCount = 0;
              }

              const fallbackCenterX = chartX + (maxChartWidth - fallbackWidth) / 2;
              const fallbackCenterY = currentY + (maxChartHeight - fallbackHeight) / 2;

              pdf.setDrawColor(203, 213, 225);
              pdf.setLineWidth(0.3);
              pdf.roundedRect(fallbackCenterX, fallbackCenterY, fallbackWidth, fallbackHeight, 2, 2, 'S');
              pdf.addImage(imgData, 'JPEG', fallbackCenterX + 1, fallbackCenterY + 1, fallbackWidth - 2, fallbackHeight - 2);
              
              chartCount++;
              if (chartCount % chartsPerRow === 0) {
                chartX = margin;
                currentY += maxChartHeight + 12;
              } else {
                chartX += maxChartWidth + margin;
              }
            }
          }

          // Move to next row if odd number of charts
          if (chartCount % chartsPerRow !== 0) {
            currentY += maxChartHeight + 12;
          }
        }

        // Tables Section (start on same page if space, otherwise new page)
        if (currentY > pageHeight - 80) {
          pdf.addPage();
          currentY = 20;
        } else if (chartImages.length > 0) {
          currentY += 10;
        }

        // Tables Section Title
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(30, 41, 59);
        pdf.text('Data Tables', margin, currentY);
        currentY += 10;

        // Generate tables based on report type
        console.log(`\n📊 Generating tables for ${reportType}`);
        console.log('Metrics object:', metrics);
        console.log('Metrics keys:', metrics ? Object.keys(metrics) : 'null');
        
        if (!metrics) {
          console.error(`❌ No metrics data for ${reportType}`);
          pdf.setFontSize(10);
          pdf.setTextColor(148, 163, 184);
          pdf.text('No data available for this report type.', margin, currentY);
        } else if (reportType === 'inventory') {
          console.log('📦 Processing inventory tables...');
          console.log('serversByModel:', metrics.serversByModel);
          console.log('serversByBrand:', metrics.serversByBrand);
          console.log('serversByLocation:', metrics.serversByLocation);
          
          // Server Models Table
          if (metrics.serversByModel && metrics.serversByModel.length > 0) {
              const total = metrics.serversByModel.reduce((sum, m) => sum + m.count, 0);
              const tableData = metrics.serversByModel.slice(0, 10).map(item => [
                item.model || 'Unknown',
                item.count?.toString() || '0',
                `${((item.count / total) * 100).toFixed(1)}%`
              ]);
              
              pdf.setFontSize(11);
              pdf.setFont('helvetica', 'bold');
              pdf.setTextColor(30, 41, 59);
              pdf.text('Top 10 Server Models', margin, currentY);
              currentY += 5;
              
              autoTable(pdf, {
                startY: currentY,
                head: [['Server Model', 'Count', 'Percentage']],
                body: tableData,
                theme: 'striped',
                headStyles: { 
                  fillColor: [59, 130, 246], 
                  fontSize: 10,
                  fontStyle: 'bold',
                  halign: 'left',
                  textColor: [255, 255, 255]
                },
                styles: { 
                  fontSize: 9, 
                  cellPadding: 3,
                  overflow: 'linebreak'
                },
                margin: { left: margin, right: margin },
                alternateRowStyles: { fillColor: [248, 250, 252] }
              });
              currentY = (pdf as any).lastAutoTable.finalY + 10;
            }

            // Servers by Brand
            if (metrics.serversByBrand && metrics.serversByBrand.length > 0) {
              if (currentY > pageHeight - 60) {
                pdf.addPage();
                currentY = 25;
              }

              const tableData = metrics.serversByBrand.map(item => [
                item.brand || 'Unknown',
                item.count?.toString() || '0'
              ]);
              
              pdf.setFontSize(11);
              pdf.setFont('helvetica', 'bold');
              pdf.setTextColor(30, 41, 59);
              pdf.text('Servers by Brand', margin, currentY);
              currentY += 5;
              
              autoTable(pdf, {
                startY: currentY,
                head: [['Brand', 'Server Count']],
                body: tableData,
                theme: 'striped',
                headStyles: { 
                  fillColor: [59, 130, 246], 
                  fontSize: 10,
                  fontStyle: 'bold',
                  halign: 'left',
                  textColor: [255, 255, 255]
                },
                styles: { 
                  fontSize: 9, 
                  cellPadding: 3 
                },
                margin: { left: margin, right: margin },
                alternateRowStyles: { fillColor: [248, 250, 252] }
              });
              currentY = (pdf as any).lastAutoTable.finalY + 10;
            }

            // Servers by Location
            if (metrics.serversByLocation && metrics.serversByLocation.length > 0) {
              if (currentY > pageHeight - 60) {
                pdf.addPage();
                currentY = 20;
              }

              const tableData = metrics.serversByLocation.map(item => [
                item.location || 'Unknown',
                item.count?.toString() || '0'
              ]);
              
              pdf.setFontSize(11);
              pdf.setFont('helvetica', 'bold');
              pdf.setTextColor(30, 41, 59);
              pdf.text('Servers by Location', margin, currentY);
              currentY += 5;
              
              autoTable(pdf, {
                startY: currentY,
                head: [['Location', 'Server Count']],
                body: tableData,
                theme: 'striped',
                headStyles: { 
                  fillColor: [59, 130, 246], 
                  fontSize: 10,
                  fontStyle: 'bold',
                  halign: 'left',
                  textColor: [255, 255, 255]
                },
                styles: { 
                  fontSize: 9, 
                  cellPadding: 3 
                },
                margin: { left: margin, right: margin },
                alternateRowStyles: { fillColor: [248, 250, 252] }
              });
              currentY = (pdf as any).lastAutoTable.finalY + 12;
            }

            // Device Type Distribution
            if (metrics.deviceTypeDistribution && metrics.deviceTypeDistribution.length > 0) {
              if (currentY > pageHeight - 60) {
                pdf.addPage();
                currentY = 20;
              }

              const tableData = metrics.deviceTypeDistribution.map(item => [
                item.deviceType || 'Unknown',
                item.count?.toString() || '0'
              ]);
              
              pdf.setFontSize(11);
              pdf.setFont('helvetica', 'bold');
              pdf.setTextColor(30, 41, 59);
              pdf.text('Device Type Distribution', margin, currentY);
              currentY += 5;
              
              autoTable(pdf, {
                startY: currentY,
                head: [['Device Type', 'Count']],
                body: tableData,
                theme: 'striped',
                headStyles: { 
                  fillColor: [59, 130, 246], 
                  fontSize: 10,
                  fontStyle: 'bold',
                  halign: 'left',
                  textColor: [255, 255, 255]
                },
                styles: { 
                  fontSize: 9, 
                  cellPadding: 3 
                },
                margin: { left: margin, right: margin },
                alternateRowStyles: { fillColor: [248, 250, 252] }
              });
              currentY = (pdf as any).lastAutoTable.finalY + 12;
            }

            // OS Distribution
            if (metrics.operatingSystemDistribution && metrics.operatingSystemDistribution.length > 0) {
              if (currentY > pageHeight - 60) {
                pdf.addPage();
                currentY = 20;
              }

              const tableData = metrics.operatingSystemDistribution.map(item => [
                item.os || 'Unknown',
                item.count?.toString() || '0'
              ]);
              
              pdf.setFontSize(11);
              pdf.setFont('helvetica', 'bold');
              pdf.setTextColor(30, 41, 59);
              pdf.text('Operating System Distribution', margin, currentY);
              currentY += 5;
              
              autoTable(pdf, {
                startY: currentY,
                head: [['Operating System', 'Count']],
                body: tableData,
                theme: 'striped',
                headStyles: { 
                  fillColor: [59, 130, 246], 
                  fontSize: 10,
                  fontStyle: 'bold',
                  halign: 'left',
                  textColor: [255, 255, 255]
                },
                styles: { 
                  fontSize: 9, 
                  cellPadding: 3 
                },
                margin: { left: margin, right: margin },
                alternateRowStyles: { fillColor: [248, 250, 252] }
              });
              currentY = (pdf as any).lastAutoTable.finalY + 12;
            }

            // Allocation Type
            if (metrics.allocationTypeDistribution && metrics.allocationTypeDistribution.length > 0) {
              if (currentY > pageHeight - 60) {
                pdf.addPage();
                currentY = 20;
              }

              const tableData = metrics.allocationTypeDistribution.map(item => [
                item.allocation || 'Unknown',
                item.count?.toString() || '0'
              ]);
              
              pdf.setFontSize(11);
              pdf.setFont('helvetica', 'bold');
              pdf.setTextColor(30, 41, 59);
              pdf.text('Allocation Type Distribution', margin, currentY);
              currentY += 5;
              
              autoTable(pdf, {
                startY: currentY,
                head: [['Allocation Type', 'Count']],
                body: tableData,
                theme: 'striped',
                headStyles: { 
                  fillColor: [59, 130, 246], 
                  fontSize: 10,
                  fontStyle: 'bold',
                  halign: 'left',
                  textColor: [255, 255, 255]
                },
                styles: { 
                  fontSize: 9, 
                  cellPadding: 3 
                },
                margin: { left: margin, right: margin },
                alternateRowStyles: { fillColor: [248, 250, 252] }
              });
              currentY = (pdf as any).lastAutoTable.finalY + 12;
            }

            // Environment Distribution
            if (metrics.environmentDistribution && metrics.environmentDistribution.length > 0) {
              if (currentY > pageHeight - 60) {
                pdf.addPage();
                currentY = 20;
              }

              const tableData = metrics.environmentDistribution.map(item => [
                item.environment || 'Unknown',
                item.count?.toString() || '0'
              ]);
              
              pdf.setFontSize(11);
              pdf.setFont('helvetica', 'bold');
              pdf.setTextColor(30, 41, 59);
              pdf.text('Environment Distribution', margin, currentY);
              currentY += 5;
              
              autoTable(pdf, {
                startY: currentY,
                head: [['Environment', 'Count']],
                body: tableData,
                theme: 'striped',
                headStyles: { 
                  fillColor: [59, 130, 246], 
                  fontSize: 10,
                  fontStyle: 'bold',
                  halign: 'left',
                  textColor: [255, 255, 255]
                },
                styles: { 
                  fontSize: 9, 
                  cellPadding: 3 
                },
                margin: { left: margin, right: margin },
                alternateRowStyles: { fillColor: [248, 250, 252] }
              });
              currentY = (pdf as any).lastAutoTable.finalY + 12;
            }

            // Server Status
            if (metrics.serversByStatus && metrics.serversByStatus.length > 0) {
              if (currentY > pageHeight - 60) {
                pdf.addPage();
                currentY = 20;
              }

              const tableData = metrics.serversByStatus.map(item => [
                item.status || 'Unknown',
                item.count?.toString() || '0'
              ]);
              
              pdf.setFontSize(11);
              pdf.setFont('helvetica', 'bold');
              pdf.setTextColor(30, 41, 59);
              pdf.text('Server Status', margin, currentY);
              currentY += 5;
              
              autoTable(pdf, {
                startY: currentY,
                head: [['Status', 'Count']],
                body: tableData,
                theme: 'striped',
                headStyles: { 
                  fillColor: [59, 130, 246], 
                  fontSize: 10,
                  fontStyle: 'bold',
                  halign: 'left',
                  textColor: [255, 255, 255]
                },
                styles: { 
                  fontSize: 9, 
                  cellPadding: 3 
                },
                margin: { left: margin, right: margin },
                alternateRowStyles: { fillColor: [248, 250, 252] }
              });
            }
        } else if (reportType === 'warranty') {
            if (metrics.warrantyStatus && metrics.warrantyStatus.length > 0) {
              const total = metrics.warrantyStatus.reduce((sum, s) => sum + s.count, 0);
              const tableData = metrics.warrantyStatus.map(item => [
                item.status || 'Unknown',
                item.count?.toString() || '0',
                `${((item.count / total) * 100).toFixed(1)}%`
              ]);
              
              pdf.setFontSize(11);
              pdf.setFont('helvetica', 'bold');
              pdf.text('Warranty Status Overview', margin, currentY);
              currentY += 5;
              
              autoTable(pdf, {
                startY: currentY,
                head: [['Status', 'Count', 'Percentage']],
                body: tableData,
                theme: 'striped',
                headStyles: { 
                  fillColor: [59, 130, 246], 
                  fontSize: 10,
                  fontStyle: 'bold',
                  halign: 'left'
                },
                styles: { 
                  fontSize: 9, 
                  cellPadding: 3 
                },
                margin: { left: margin, right: margin },
                alternateRowStyles: { fillColor: [248, 250, 252] }
              });
              currentY = (pdf as any).lastAutoTable.finalY + 10;
            }

            if (metrics.serversNeedingRenewal && metrics.serversNeedingRenewal.length > 0) {
              if (currentY > pageHeight - 60) {
                pdf.addPage();
                currentY = 25;
              }

              const tableData = metrics.serversNeedingRenewal.slice(0, 6).map(item => [
                item.month || 'Unknown',
                item.count?.toString() || '0'
              ]);
              
              pdf.setFontSize(11);
              pdf.setFont('helvetica', 'bold');
              pdf.text('Servers Needing Renewal', margin, currentY);
              currentY += 5;
              
              autoTable(pdf, {
                startY: currentY,
                head: [['Month', 'Servers']],
                body: tableData,
                theme: 'striped',
                headStyles: { 
                  fillColor: [59, 130, 246], 
                  fontSize: 10,
                  fontStyle: 'bold',
                  halign: 'left'
                },
                styles: { 
                  fontSize: 9, 
                  cellPadding: 3 
                },
                margin: { left: margin, right: margin },
                alternateRowStyles: { fillColor: [248, 250, 252] }
              });
            }
        } else if (reportType === 'utilization') {
            if (metrics.rackCapacityByDC && metrics.rackCapacityByDC.length > 0) {
              const tableData = metrics.rackCapacityByDC.map(item => [
                item.dataCenter || 'Unknown',
                item.racks?.toString() || '0',
                `${item.utilizationPct?.toFixed(1) || '0'}%`
              ]);
              
              pdf.setFontSize(11);
              pdf.setFont('helvetica', 'bold');
              pdf.text('Data Center Utilization', margin, currentY);
              currentY += 5;
              
              autoTable(pdf, {
                startY: currentY,
                head: [['Data Center', 'Racks', 'Utilization %']],
                body: tableData,
                theme: 'striped',
                headStyles: { 
                  fillColor: [59, 130, 246], 
                  fontSize: 10,
                  fontStyle: 'bold',
                  halign: 'left'
                },
                styles: { 
                  fontSize: 9, 
                  cellPadding: 3 
                },
                margin: { left: margin, right: margin },
                alternateRowStyles: { fillColor: [248, 250, 252] }
              });
              currentY = (pdf as any).lastAutoTable.finalY + 10;
            }

            if (metrics.topUtilizedRacks && metrics.topUtilizedRacks.length > 0) {
              if (currentY > pageHeight - 60) {
                pdf.addPage();
                currentY = 25;
              }

              const tableData = metrics.topUtilizedRacks.slice(0, 10).map(item => [
                item.rack || 'Unknown',
                item.used?.toString() || '0',
                item.capacity?.toString() || '0',
                `${item.utilizationPct?.toFixed(1) || '0'}%`
              ]);
              
              pdf.setFontSize(11);
              pdf.setFont('helvetica', 'bold');
              pdf.text('Top 10 Racks by Utilization', margin, currentY);
              currentY += 5;
              
              autoTable(pdf, {
                startY: currentY,
                head: [['Rack', 'Used U', 'Total U', 'Utilization %']],
                body: tableData,
                theme: 'striped',
                headStyles: { 
                  fillColor: [59, 130, 246], 
                  fontSize: 10,
                  fontStyle: 'bold',
                  halign: 'left'
                },
                styles: { 
                  fontSize: 9, 
                  cellPadding: 3 
                },
                margin: { left: margin, right: margin },
                alternateRowStyles: { fillColor: [248, 250, 252] }
              });
            }
        } else if (reportType === 'maintenance') {
            if (metrics.maintenanceVsActive && metrics.maintenanceVsActive.length > 0) {
              const total = metrics.maintenanceVsActive.reduce((sum, s) => sum + s.count, 0);
              const tableData = metrics.maintenanceVsActive.map(item => [
                item.status || 'Unknown',
                item.count?.toString() || '0',
                `${((item.count / total) * 100).toFixed(1)}%`
              ]);
              
              pdf.setFontSize(11);
              pdf.setFont('helvetica', 'bold');
              pdf.text('Maintenance Status Overview', margin, currentY);
              currentY += 5;
              
              autoTable(pdf, {
                startY: currentY,
                head: [['Status', 'Count', 'Percentage']],
                body: tableData,
                theme: 'striped',
                headStyles: { 
                  fillColor: [59, 130, 246], 
                  fontSize: 10,
                  fontStyle: 'bold',
                  halign: 'left'
                },
                styles: { 
                  fontSize: 9, 
                  cellPadding: 3 
                },
                margin: { left: margin, right: margin },
                alternateRowStyles: { fillColor: [248, 250, 252] }
              });
              currentY = (pdf as any).lastAutoTable.finalY + 10;
            }

            if (metrics.maintenanceByLocation && metrics.maintenanceByLocation.length > 0) {
              if (currentY > pageHeight - 60) {
                pdf.addPage();
                currentY = 25;
              }

              const tableData = metrics.maintenanceByLocation.map(item => [
                item.location || 'Unknown',
                item.maintenance?.toString() || '0',
                item.total?.toString() || '0'
              ]);
              
              pdf.setFontSize(11);
              pdf.setFont('helvetica', 'bold');
              pdf.text('Maintenance by Location', margin, currentY);
              currentY += 5;
              
              autoTable(pdf, {
                startY: currentY,
                head: [['Location', 'In Maintenance', 'Total']],
                body: tableData,
                theme: 'striped',
                headStyles: { 
                  fillColor: [59, 130, 246], 
                  fontSize: 10,
                  fontStyle: 'bold',
                  halign: 'left'
                },
                styles: { 
                  fontSize: 9, 
                  cellPadding: 3 
                },
                margin: { left: margin, right: margin },
                alternateRowStyles: { fillColor: [248, 250, 252] }
              });
            }
        } else if (reportType === 'activity') {
            if (metrics.activityByType && metrics.activityByType.length > 0) {
              const total = metrics.activityByType.reduce((sum, a) => sum + a.count, 0);
              const tableData = metrics.activityByType.map(item => [
                item.action_type || 'Unknown',
                item.count?.toString() || '0',
                `${((item.count / total) * 100).toFixed(1)}%`
              ]);
              
              pdf.setFontSize(11);
              pdf.setFont('helvetica', 'bold');
              pdf.text('Activity by Type', margin, currentY);
              currentY += 5;
              
              autoTable(pdf, {
                startY: currentY,
                head: [['Activity Type', 'Count', 'Percentage']],
                body: tableData,
                theme: 'striped',
                headStyles: { 
                  fillColor: [59, 130, 246], 
                  fontSize: 10,
                  fontStyle: 'bold',
                  halign: 'left'
                },
                styles: { 
                  fontSize: 9, 
                  cellPadding: 3 
                },
                margin: { left: margin, right: margin },
                alternateRowStyles: { fillColor: [248, 250, 252] }
              });
              currentY = (pdf as any).lastAutoTable.finalY + 10;
            }

            if (metrics.activityByUser && metrics.activityByUser.length > 0) {
              if (currentY > pageHeight - 60) {
                pdf.addPage();
                currentY = 25;
              }

              const tableData = metrics.activityByUser.slice(0, 10).map(item => [
                item.user_name || item.user_email || 'Unknown',
                item.action_count?.toString() || '0'
              ]);
              
              pdf.setFontSize(11);
              pdf.setFont('helvetica', 'bold');
              pdf.text('Top 10 Most Active Users', margin, currentY);
              currentY += 5;
              
              autoTable(pdf, {
                startY: currentY,
                head: [['User', 'Activity Count']],
                body: tableData,
                theme: 'striped',
                headStyles: { 
                  fillColor: [59, 130, 246], 
                  fontSize: 10,
                  fontStyle: 'bold',
                  halign: 'left'
                },
                styles: { 
                  fontSize: 9, 
                  cellPadding: 3 
                },
                margin: { left: margin, right: margin },
                alternateRowStyles: { fillColor: [248, 250, 252] }
              });
              currentY = (pdf as any).lastAutoTable.finalY + 10;
            }

            if (metrics.activityLogs && metrics.activityLogs.length > 0) {
              if (currentY > pageHeight - 60) {
                pdf.addPage();
                currentY = 25;
              }

              const tableData = metrics.activityLogs.slice(0, 15).map(item => [
                new Date(item.created_at).toLocaleDateString(),
                new Date(item.created_at).toLocaleTimeString(),
                (item.user_name || item.user_email || 'System').substring(0, 25),
                item.action_type || 'Unknown',
                item.entity_type || 'Unknown'
              ]);
              
              pdf.setFontSize(11);
              pdf.setFont('helvetica', 'bold');
              pdf.text('Recent Activity Logs', margin, currentY);
              currentY += 5;
              
              autoTable(pdf, {
                startY: currentY,
                head: [['Date', 'Time', 'User', 'Action', 'Entity']],
                body: tableData,
                theme: 'striped',
                headStyles: { 
                  fillColor: [59, 130, 246], 
                  fontSize: 9,
                  fontStyle: 'bold',
                  halign: 'left'
                },
                styles: { 
                  fontSize: 8, 
                  cellPadding: 2 
                },
                margin: { left: margin, right: margin },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                columnStyles: {
                  0: { cellWidth: 25 },
                  1: { cellWidth: 22 },
                  2: { cellWidth: 45 },
                  3: { cellWidth: 30 },
                  4: { cellWidth: 28 }
                }
              });
            }
        }
      }

      // Save the PDF
      pdf.save(`all-reports-complete-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Complete export error:', error);
      throw new Error('Failed to export all reports. Make sure html2canvas, jspdf, and jspdf-autotable are installed.');
    }
  }

  // Helper function to create styled table from data (legacy - not used in new PDF export)
  private static createDataTable(headers: string[], rows: any[][], title?: string): HTMLElement {
    const tableContainer = document.createElement('div');
    tableContainer.style.marginBottom = '20px';
    tableContainer.style.border = '1px solid #e2e8f0';
    tableContainer.style.borderRadius = '8px';
    tableContainer.style.overflow = 'hidden';
    tableContainer.style.backgroundColor = 'white';

    if (title) {
      const tableTitle = document.createElement('div');
      tableTitle.textContent = title;
      tableTitle.style.fontSize = '14px';
      tableTitle.style.fontWeight = '600';
      tableTitle.style.padding = '12px 16px';
      tableTitle.style.backgroundColor = '#f8fafc';
      tableTitle.style.borderBottom = '1px solid #e2e8f0';
      tableTitle.style.color = '#334155';
      tableContainer.appendChild(tableTitle);
    }

    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.fontSize = '13px';

    // Create header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.style.backgroundColor = '#f1f5f9';
    headers.forEach(header => {
      const th = document.createElement('th');
      th.textContent = header;
      th.style.padding = '10px 12px';
      th.style.textAlign = 'left';
      th.style.fontWeight = '600';
      th.style.color = '#475569';
      th.style.borderBottom = '2px solid #e2e8f0';
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create body
    const tbody = document.createElement('tbody');
    rows.forEach((row, index) => {
      const tr = document.createElement('tr');
      if (index % 2 === 0) {
        tr.style.backgroundColor = '#ffffff';
      } else {
        tr.style.backgroundColor = '#f8fafc';
      }
      row.forEach(cell => {
        const td = document.createElement('td');
        td.textContent = String(cell);
        td.style.padding = '10px 12px';
        td.style.color = '#334155';
        td.style.borderBottom = '1px solid #e2e8f0';
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    tableContainer.appendChild(table);

    return tableContainer;
  }

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
