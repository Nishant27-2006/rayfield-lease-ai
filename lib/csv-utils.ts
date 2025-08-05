export interface CSVData {
  [key: string]: string | number | boolean | null | undefined;
}

export function convertToCSV(data: CSVData[], headers?: string[]): string {
  if (!data || data.length === 0) {
    return '';
  }

  // Use provided headers or extract from first object
  const csvHeaders = headers || Object.keys(data[0]);
  
  // Format field for CSV (escape quotes, handle commas)
  const formatCSVField = (field: any): string => {
    if (field === null || field === undefined) {
      return '';
    }
    
    const stringField = String(field);
    
    // If the field contains commas, quotes, or newlines, wrap it in quotes
    if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
      return `"${stringField.replace(/"/g, '""')}"`;
    }
    
    return stringField;
  };

  // Create CSV content
  const csvContent = [
    // Header row
    csvHeaders.map(formatCSVField).join(','),
    // Data rows
    ...data.map(row => 
      csvHeaders.map(header => formatCSVField(row[header])).join(',')
    )
  ].join('\n');

  return csvContent;
}

export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export function createCSVDownloadLink(data: CSVData[], filename: string, headers?: string[]): HTMLAnchorElement {
  const csvContent = convertToCSV(data, headers);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  
  return link;
}