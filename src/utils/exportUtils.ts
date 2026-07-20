import React from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export interface ExportData {
  title: string;
  headers: string[];
  data: (string | number | boolean | null)[][];
  metadata?: {
    generatedBy?: string;
    generatedAt?: string;
    totalRecords?: number;
    filters?: string;
  };
}

export interface ChartExportData {
  title: string;
  chartType: string;
  data: Record<string, unknown>;
  imageData?: string; // base64 image data
}

// Export to PDF
export const exportToPDF = (exportData: ExportData, chartData?: ChartExportData[]) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // Add header
  doc.setFontSize(20);
  doc.setTextColor(40, 40, 40);
  doc.text('Benedict College MIS - Reports', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(16);
  doc.text(exportData.title, pageWidth / 2, 35, { align: 'center' });
  
  // Add metadata
  let yPosition = 50;
  if (exportData.metadata) {
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    
    if (exportData.metadata.generatedAt) {
      doc.text(`Generated: ${exportData.metadata.generatedAt}`, 20, yPosition);
      yPosition += 7;
    }
    
    if (exportData.metadata.totalRecords) {
      doc.text(`Total Records: ${exportData.metadata.totalRecords}`, 20, yPosition);
      yPosition += 7;
    }
    
    if (exportData.metadata.filters) {
      doc.text(`Filters: ${exportData.metadata.filters}`, 20, yPosition);
      yPosition += 7;
    }
    
    yPosition += 10;
  }
  
  // Add charts if provided
  if (chartData && chartData.length > 0) {
    chartData.forEach((chart, index) => {
      if (chart.imageData) {
        doc.addImage(chart.imageData, 'PNG', 20, yPosition, 170, 100);
        yPosition += 110;
        
        // Add new page if needed
        if (yPosition > 250 && index < chartData.length - 1) {
          doc.addPage();
          yPosition = 20;
        }
      }
    });
    
    // Add new page for table if charts were added
    if (yPosition > 150) {
      doc.addPage();
      yPosition = 20;
    }
  }
  
  // Add table
  autoTable(doc, {
    head: [exportData.headers],
    body: exportData.data,
    startY: yPosition,
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [59, 130, 246], // Blue color
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // Light gray
    },
    margin: { top: 20, right: 20, bottom: 20, left: 20 },
  });
  
  // Add footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Page ${i} of ${pageCount} | Benedict College MIS`,
      pageWidth / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }
  
  // Save the PDF
  const fileName = `${exportData.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};

// Export to Excel
export const exportToExcel = (exportData: ExportData, chartData?: ChartExportData[]) => {
  const workbook = XLSX.utils.book_new();
  
  // Create main data worksheet
  const worksheetData = [
    [exportData.title],
    [],
    ...(exportData.metadata ? [
      ['Generated:', exportData.metadata.generatedAt || new Date().toLocaleString()],
      ['Total Records:', exportData.metadata.totalRecords || exportData.data.length],
      ...(exportData.metadata.filters ? [['Filters:', exportData.metadata.filters]] : []),
      []
    ] : []),
    exportData.headers,
    ...exportData.data
  ];
  
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  
  // Style the header
  const _range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  const _headerRowIndex = exportData.metadata ? 6 : 2;
  
  // Set column widths
  const colWidths = exportData.headers.map(() => ({ wch: 15 }));
  worksheet['!cols'] = colWidths;
  
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Report Data');
  
  // Add chart data as separate sheets if provided
  if (chartData && chartData.length > 0) {
    chartData.forEach((chart, index) => {
      const chartWorksheet = XLSX.utils.json_to_sheet([
        { Chart: chart.title, Type: chart.chartType },
        ...Object.entries(chart.data).map(([key, value]) => ({ [key]: value }))
      ]);
      XLSX.utils.book_append_sheet(workbook, chartWorksheet, `Chart_${index + 1}`);
    });
  }
  
  // Save the Excel file
  const fileName = `${exportData.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

// Export to CSV
export const exportToCSV = (exportData: ExportData) => {
  const csvContent = [
    [exportData.title],
    [],
    ...(exportData.metadata ? [
      ['Generated:', exportData.metadata.generatedAt || new Date().toLocaleString()],
      ['Total Records:', exportData.metadata.totalRecords || exportData.data.length],
      ...(exportData.metadata.filters ? [['Filters:', exportData.metadata.filters]] : []),
      []
    ] : []),
    exportData.headers,
    ...exportData.data
  ];
  
  const csvString = csvContent
    .map(row => 
      row.map(cell => 
        typeof cell === 'string' && cell.includes(',') 
          ? `"${cell.replace(/"/g, '""')}"` 
          : cell
      ).join(',')
    )
    .join('\n');
  
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const fileName = `${exportData.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
  saveAs(blob, fileName);
};

// Helper function to convert chart canvas to image data
export const getChartImageData = (chartRef: React.RefObject<HTMLCanvasElement>): Promise<string> => {
  return new Promise((resolve) => {
    if (chartRef && chartRef.current) {
      const canvas = chartRef.current;
      const imageData = canvas.toDataURL('image/png');
      resolve(imageData);
    } else {
      resolve('');
    }
  });
};

// Helper function to prepare data for export
export const prepareTableDataForExport = (data: Record<string, unknown>[], columns: string[]): string[][] => {
  return data.map(item => 
    columns.map(column => {
      const value = item[column];
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value);
    })
  );
};

// Helper function to format date for export
export const formatDateForExport = (date: Date | string): string => {
  const d = new Date(date);
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
};