import React, { useState, useEffect } from 'react';
import apiPatient from '@/services/ApiPatient';
import AppLayout from '@/layouts/app-layout';
import { computePaymentStatus } from '@/utils/financialStatus';
import {
  PhilippinePeso,
  Search,
  Calendar,
  CreditCard,
  Receipt,
  AlertCircle,
  CheckCircle,
  Clock,
  ChevronRight,
  RefreshCw,
  Download,
  Eye,
  XCircle,
  TrendingUp,
  FileText
} from 'lucide-react';

// ---------- Types ----------
interface BillingRecord {
  id: number;
  patient: { id: number; name: string };
  appointment?: { id: number; service: { name: string }; appointment_date: string };
  amount: number;
  balance?: number;
  payment_method?: string;
  payment_status: 'pending' | 'paid' | 'partial' | 'overdue';
  description?: string;
  transaction_date: string;
  due_date?: string;
  paid_date?: string;
  created_at: string;
}

interface Filters {
  payment_status: string;
  date_from: string;
  date_to: string;
  search: string;
}

interface FinancialSummary {
  total_amount: number;
  total_paid: number;
  total_pending: number;
  total_overdue: number;
}

// ---------- Constants ----------
const paymentStatusConfig = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  { value: 'paid', label: 'Paid', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  { value: 'partial', label: 'Partial', color: 'bg-blue-100 text-blue-800', icon: TrendingUp },
  { value: 'overdue', label: 'Overdue', color: 'bg-red-100 text-red-800', icon: AlertCircle }
];

// ---------- Main Component ----------
export default function PatientBillingIndex() {
  const [records, setRecords] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<BillingRecord | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    payment_status: '',
    date_from: '',
    date_to: '',
    search: ''
  });
  const [summary, setSummary] = useState<FinancialSummary>({
    total_amount: 0,
    total_paid: 0,
    total_pending: 0,
    total_overdue: 0
  });

  // ---------- API Functions ----------
  const parseAmount = (value: any): number => {
    if (typeof value === 'number' && !Number.isNaN(value)) return value;
    if (!value) return 0;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[^0-9.-]+/g, '');
      const parsed = parseFloat(cleaned);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
    return Number(value) || 0;
  };

  const computeSummaryFromRecords = (recordsList: BillingRecord[]) => {
    const totalAmount = recordsList.reduce((sum: number, r: BillingRecord) => sum + parseAmount(r.amount), 0);
    const totalPaid = recordsList
      .filter((r: BillingRecord) => r.payment_status === 'paid')
      .reduce((sum: number, r: BillingRecord) => sum + parseAmount(r.amount), 0);
    const totalPending = recordsList
      .filter((r: BillingRecord) => ['pending', 'partial'].includes(r.payment_status))
      .reduce((sum: number, r: BillingRecord) => sum + parseAmount((r as any).balance ?? r.amount), 0);
    const totalOverdue = recordsList
      .filter((r: BillingRecord) => r.payment_status === 'overdue')
      .reduce((sum: number, r: BillingRecord) => sum + parseAmount((r as any).balance ?? r.amount), 0);

    return {
      total_amount: totalAmount,
      total_paid: totalPaid,
      total_pending: totalPending,
      total_overdue: totalOverdue,
    };
  };

  const fetchBillingRecords = async () => {
    try {
      setLoading(true);

      const recordsRes = await apiPatient.getMyBillingRecords(filters);

      let recordsList = [];
      if (recordsRes?.data) {
        recordsList = Array.isArray(recordsRes.data)
          ? recordsRes.data
          : recordsRes.data.data || recordsRes.data.records || [];
      } else {
        recordsList = recordsRes?.records || recordsRes || [];
      }

      const mappedRecords = recordsList.map((record: any) => ({
        ...record,
        payment_status: computePaymentStatus(record)
      }));

      setRecords(mappedRecords);
      setSummary(computeSummaryFromRecords(mappedRecords));
    } catch (error) {
      console.error('Error fetching billing records:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingRecords();
  }, [filters.payment_status, filters.date_from, filters.date_to]);

  // ---------- Handlers ----------
  const handleViewDetails = (record: BillingRecord) => {
    setSelectedRecord(record);
    setShowDetailsModal(true);
  };

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ payment_status: '', date_from: '', date_to: '', search: '' });
  };

  // ---------- Helper Functions ----------
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPaymentStatusConfig = (status: string) => {
    return paymentStatusConfig.find(s => s.value === status) || paymentStatusConfig[0];
  };

  const isOverdue = (record: BillingRecord) => {
    if (!record.due_date || record.payment_status === 'paid') return false;
    return new Date(record.due_date) < new Date();
  };

  // Filter records by search
  const filteredRecords = records.filter(record => {
    if (!filters.search) return true;
    const searchLower = filters.search.toLowerCase();
    return (
      record.description?.toLowerCase().includes(searchLower) ||
      record.appointment?.service?.name.toLowerCase().includes(searchLower) ||
      record.payment_method?.toLowerCase().includes(searchLower)
    );
  });

  // ---------- Render Component ----------
  return (
    <AppLayout>
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Billing & Payments</h1>
              <p className="text-gray-600 mt-1">View your billing history and payment records</p>
            </div>
            <button
              onClick={fetchBillingRecords}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Financial Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.total_amount)}</p>
              </div>
              <Receipt className="w-8 h-8 text-gray-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Paid</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.total_paid)}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{formatCurrency(summary.total_pending)}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.total_overdue)}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search billing records..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <select
                value={filters.payment_status}
                onChange={(e) => handleFilterChange('payment_status', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                {paymentStatusConfig.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
              <input
                type="date"
                value={filters.date_from}
                onChange={(e) => handleFilterChange('date_from', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="From"
              />
              <input
                type="date"
                value={filters.date_to}
                onChange={(e) => handleFilterChange('date_to', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="To"
              />
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Billing Records List */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mr-2" />
              <span className="text-gray-600">Loading billing records...</span>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Receipt className="w-16 h-16 text-gray-300 mb-4" />
              <p className="text-gray-600 font-medium">No billing records found</p>
              <p className="text-gray-400 text-sm mt-1">Your payment history will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredRecords.map((record) => {
                const statusCfg = getPaymentStatusConfig(record.payment_status);
                const StatusIcon = statusCfg.icon;

                return (
                  <div
                    key={record.id}
                    className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => handleViewDetails(record)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4 flex-1">
                        <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                          <Receipt className="w-6 h-6 text-blue-600" />
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {record.appointment?.service?.name || record.description || 'Medical Service'}
                            </h3>
                            <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${statusCfg.color}`}>
                              <StatusIcon className="w-3 h-3" />
                              {statusCfg.label}
                            </span>
                            {isOverdue(record) && record.payment_status !== 'paid' && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                                <AlertCircle className="w-3 h-3" />
                                Overdue
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <PhilippinePeso className="w-4 h-4 text-gray-400" />
                              <span className="font-semibold text-gray-900">{formatCurrency(record.amount)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              <span>{formatDate(record.transaction_date)}</span>
                            </div>
                            {record.payment_method && (
                              <div className="flex items-center gap-2">
                                <CreditCard className="w-4 h-4 text-gray-400" />
                                <span>{record.payment_method}</span>
                              </div>
                            )}
                          </div>

                          {record.due_date && record.payment_status !== 'paid' && (
                            <div className="mt-2 text-sm text-gray-600">
                              <span className="font-medium">Due Date: </span>
                              <span className={isOverdue(record) ? 'text-red-600 font-medium' : ''}>
                                {formatDate(record.due_date)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <ChevronRight className="w-5 h-5 text-gray-400 ml-4" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedRecord && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Receipt className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Billing Record</h2>
                    <p className="text-sm text-gray-600 mt-1">Transaction ID: #{selectedRecord.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Status */}
              <div>
                <label className="text-sm font-medium text-gray-700">Payment Status</label>
                <div className="mt-2">
                  <span className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg ${getPaymentStatusConfig(selectedRecord.payment_status).color}`}>
                    {React.createElement(getPaymentStatusConfig(selectedRecord.payment_status).icon, { className: "w-4 h-4" })}
                    {getPaymentStatusConfig(selectedRecord.payment_status).label}
                  </span>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="text-sm font-medium text-gray-700">Amount</label>
                <div className="mt-2 text-3xl font-bold text-gray-900">
                  {formatCurrency(selectedRecord.amount)}
                </div>
              </div>

              {/* Service/Description */}
              <div>
                <label className="text-sm font-medium text-gray-700">Service</label>
                <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-900">
                    {selectedRecord.appointment?.service?.name || selectedRecord.description || 'Medical Service'}
                  </p>
                  {selectedRecord.appointment && (
                    <p className="text-sm text-gray-600 mt-1">
                      Appointment Date: {formatDate(selectedRecord.appointment.appointment_date)}
                    </p>
                  )}
                </div>
              </div>

              {/* Payment Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Transaction Date</label>
                  <div className="mt-2 flex items-center gap-2 text-gray-900">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>{formatDate(selectedRecord.transaction_date)}</span>
                  </div>
                </div>
                {selectedRecord.payment_method && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Payment Method</label>
                    <div className="mt-2 flex items-center gap-2 text-gray-900">
                      <CreditCard className="w-4 h-4 text-gray-400" />
                      <span>{selectedRecord.payment_method}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Due Date / Paid Date */}
              {(selectedRecord.due_date || selectedRecord.paid_date) && (
                <div className="grid grid-cols-2 gap-4">
                  {selectedRecord.due_date && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Due Date</label>
                      <div className="mt-2 flex items-center gap-2 text-gray-900">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className={isOverdue(selectedRecord) && selectedRecord.payment_status !== 'paid' ? 'text-red-600 font-medium' : ''}>
                          {formatDate(selectedRecord.due_date)}
                        </span>
                      </div>
                    </div>
                  )}
                  {selectedRecord.paid_date && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Paid Date</label>
                      <div className="mt-2 flex items-center gap-2 text-gray-900">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span>{formatDate(selectedRecord.paid_date)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Overdue Warning */}
              {isOverdue(selectedRecord) && selectedRecord.payment_status !== 'paid' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-900 text-sm">Payment Overdue</p>
                      <p className="text-sm text-red-700 mt-1">
                        This payment is past its due date. Please contact the clinic to arrange payment.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Info Banner */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900 text-sm">Payment Information</p>
                    <p className="text-sm text-blue-700 mt-1">
                      For questions about this billing record or to arrange payment,
                      please contact our billing department or visit the clinic.
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    // In a real app, this would generate a receipt
                    console.log('Download receipt:', selectedRecord.id);
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50"
                >
                  <Download className="w-4 h-4" />
                  Download Receipt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </AppLayout>
  );
}
