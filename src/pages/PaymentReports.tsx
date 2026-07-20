import React, { useEffect, useState } from 'react';
import { useSettingsContext } from '../utils/settingsUtils';
import { BarChart3, Calendar, Download, DollarSign, CreditCard, Landmark, FileText, FileSpreadsheet, Printer, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';
import { exportToPDF, exportToExcel, exportToCSV, ExportData, formatDateForExport } from '../utils/exportUtils';

interface PaymentReport {
  payments: any[];
  summary: {
    totalAmount: number;
    count: number;
    byMethod: Record<string, number>;
  };
  dateRange: {
    start: string;
    end: string;
  };
}

interface MethodReport {
  breakdown: Record<string, {
    total: number;
    count: number;
    details: Record<string, number>;
  }>;
  dateRange: {
    start: string;
    end: string;
  };
}

const PaymentReports: React.FC = () => {
  const { theme } = useSettingsContext();
  const [activeTab, setActiveTab] = useState<'daily' | 'method'>('daily');
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  const [dailyReport, setDailyReport] = useState<PaymentReport | null>(null);
  const [methodReport, setMethodReport] = useState<MethodReport | null>(null);

  useEffect(() => {
    fetchReport();
  }, [activeTab, startDate, endDate]);

  // Dweezil's Code - Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.export-menu-container')) {
        setShowExportMenu(false);
      }
    };

    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportMenu]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      if (activeTab === 'daily') {
        const response = await api.get(`/payments/reports/daily-collection?startDate=${startDate}&endDate=${endDate}`);
        setDailyReport(response.data.data);
      } else {
        const response = await api.get(`/payments/reports/by-method?startDate=${startDate}&endDate=${endDate}`);
        setMethodReport(response.data.data);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching report:', error);
      toast.error('Failed to generate report');
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₱ ${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Dweezil's Code - Export functionality for payment reports
  const handleExport = (format: 'pdf' | 'excel' | 'csv') => {
    if (!dailyReport && !methodReport) {
      toast.error('No data available to export');
      return;
    }

    let exportData: ExportData;

    if (activeTab === 'daily' && dailyReport) {
      // Export Daily Collection Report
      exportData = {
        title: 'Daily Collection Report',
        headers: ['Date', 'Student', 'Reference', 'Type', 'Method', 'Amount'],
        data: dailyReport.payments.map(payment => [
          new Date(payment.paidDate).toLocaleDateString(),
          `${payment.student?.user?.firstName || ''} ${payment.student?.user?.lastName || ''}`.trim(),
          payment.transactionId || '-',
          payment.type || '-',
          payment.paymentMethod?.replace('_', ' ') || '-',
          formatCurrency(payment.amount)
        ]),
        metadata: {
          generatedAt: formatDateForExport(new Date()),
          totalRecords: dailyReport.payments.length,
          filters: `Date Range: ${startDate} to ${endDate}`
        }
      };

      // Add summary row
      exportData.data.push(
        [],
        ['', '', '', '', 'Total:', formatCurrency(dailyReport.summary.totalAmount)]
      );
    } else if (activeTab === 'method' && methodReport) {
      // Export Payment Method Report
      const methodRows: (string | number)[][] = [];
      
      Object.entries(methodReport.breakdown).forEach(([method, data]) => {
        methodRows.push([
          method.replace('_', ' '),
          data.count.toString(),
          formatCurrency(data.total)
        ]);

        // Add breakdown details if available
        if (Object.keys(data.details).length > 0) {
          Object.entries(data.details).forEach(([key, amount]) => {
            methodRows.push([
              `  - ${key}`,
              '',
              formatCurrency(amount)
            ]);
          });
        }
      });

      exportData = {
        title: 'Payment Method Report',
        headers: ['Payment Method', 'Transactions', 'Total Amount'],
        data: methodRows,
        metadata: {
          generatedAt: formatDateForExport(new Date()),
          totalRecords: Object.keys(methodReport.breakdown).length,
          filters: `Date Range: ${startDate} to ${endDate}`
        }
      };

      // Add grand total
      const grandTotal = Object.values(methodReport.breakdown).reduce((sum, data) => sum + data.total, 0);
      exportData.data.push(
        [],
        ['Grand Total', '', formatCurrency(grandTotal)]
      );
    } else {
      toast.error('No data available to export');
      return;
    }

    try {
      switch (format) {
        case 'pdf':
          exportToPDF(exportData);
          toast.success('Report exported as PDF');
          break;
        case 'excel':
          exportToExcel(exportData);
          toast.success('Report exported as Excel');
          break;
        case 'csv':
          exportToCSV(exportData);
          toast.success('Report exported as CSV');
          break;
      }
      setShowExportMenu(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export report');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            Payment Reports
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Generate financial reports and collection summaries
          </p>
        </div>
        <div className="relative export-menu-container">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
            <ChevronDown className="w-4 h-4 ml-1" />
          </button>
          
          {showExportMenu && (
            <div className={`absolute right-0 mt-2 w-48 rounded-md shadow-lg z-10 ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
              <div className="py-1">
                <button
                  onClick={() => handleExport('pdf')}
                  className={`flex items-center w-full px-4 py-2 text-sm ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Export as PDF
                </button>
                <button
                  onClick={() => handleExport('excel')}
                  className={`flex items-center w-full px-4 py-2 text-sm ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export as Excel
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  className={`flex items-center w-full px-4 py-2 text-sm ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export as CSV
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Date Filters */}
      <div className={`p-4 rounded-lg shadow ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
              <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Date Range:</span>
            </div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={`px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
            />
            <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={`px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('daily')}
              className={`${
                activeTab === 'daily'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
            >
              <FileText className="h-4 w-4" />
              Daily Collection
            </button>
            <button
              onClick={() => setActiveTab('method')}
              className={`${
                activeTab === 'method'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
            >
              <CreditCard className="h-4 w-4" />
              Payment Methods
            </button>
          </nav>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className={`mt-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Generating report...</p>
          </div>
        ) : (
          <>
            {activeTab === 'daily' && dailyReport && (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className={`p-6 rounded-lg shadow border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <h3 className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Total Collection</h3>
                    <p className={`text-3xl font-bold mt-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {formatCurrency(dailyReport.summary.totalAmount)}
                    </p>
                  </div>
                  <div className={`p-6 rounded-lg shadow border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <h3 className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Total Transactions</h3>
                    <p className={`text-3xl font-bold mt-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {dailyReport.summary.count}
                    </p>
                  </div>
                </div>

                {/* Transaction Table */}
                <div className={`rounded-lg shadow overflow-hidden ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Transaction Details</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className={`min-w-full divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
                      <thead className={theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}>
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
                        {dailyReport.payments.map((payment) => (
                          <tr key={payment.id} className={theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                              {new Date(payment.paidDate).toLocaleDateString()}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                              {payment.student?.user?.firstName} {payment.student?.user?.lastName}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                              {payment.transactionId || '-'}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                              <span className="capitalize">{payment.paymentMethod?.replace('_', ' ')}</span>
                              {payment.remarks && <span className="text-xs text-gray-500 block">{payment.remarks}</span>}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                              {formatCurrency(payment.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'method' && methodReport && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  {Object.entries(methodReport.breakdown).map(([method, data]) => (
                    <div key={method} className={`rounded-lg shadow overflow-hidden ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
                      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-blue-900/50' : 'bg-blue-50'}`}>
                            {method === 'CASH' ? <DollarSign className="h-6 w-6 text-green-600" /> :
                             method === 'BANK_TRANSFER' ? <Landmark className="h-6 w-6 text-blue-600" /> :
                             <CreditCard className="h-6 w-6 text-purple-600" />}
                          </div>
                          <div>
                            <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                              {method.replace('_', ' ')}
                            </h3>
                            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                              {data.count} transactions
                            </p>
                          </div>
                        </div>
                        <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {formatCurrency(data.total)}
                        </p>
                      </div>
                      
                      {Object.keys(data.details).length > 0 && (
                        <div className={`px-6 py-4 ${theme === 'dark' ? 'bg-gray-700/30' : 'bg-gray-50'}`}>
                          <h4 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            Breakdown
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {Object.entries(data.details).map(([key, amount]) => (
                              <div key={key} className="flex justify-between items-center p-3 rounded bg-white dark:bg-gray-800 shadow-sm">
                                <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                  {key}
                                </span>
                                <span className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                  {formatCurrency(amount)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
    </div>
  );
};

export default PaymentReports;
