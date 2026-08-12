import React, { useState, useEffect } from 'react';
import { usePage } from '@inertiajs/react';
import apiPatient from  '@/services/ApiPatient';
import AppLayout from '@/layouts/app-layout';
import {
  FileText,
  Search,
  Calendar,
  Clock,
  User,
  Activity,
  Pill,
  AlertCircle,
  ChevronRight,
  RefreshCw,
  Download,
  XCircle,
  Heart,
  Stethoscope,
  ClipboardList,
  Smile
} from 'lucide-react';

// ---------- Types ----------
interface MedicalRecord {
  id: number;
  doctor: { id: number; name: string; specialization?: string };
  appointment?: { id: number; appointment_date: string };
  record_type: string;
  diagnosis: string;
  treatment: string;
  prescriptions?: string;
  notes?: string;
  record_date: string;
  created_at: string;
}

interface ToothRecord {
  id: number;
  patient_id: number;
  doctor_id: number;
  tooth_number: number;
  service: string;
  date_done: string;
  notes?: string;
  financial_record_id?: number;
  doctor?: { id: number; name: string };
  financialRecord?: { id: number; amount: number; payment_status: string };
  created_at?: string;
}

interface Filters {
  record_type: string;
  date_from: string;
  date_to: string;
  search: string;
}

// ---------- Constants ----------
const recordTypes = [
  { value: 'consultation', label: 'Consultation', icon: Stethoscope, color: 'text-blue-600' },
  { value: 'diagnosis', label: 'Diagnosis', icon: Activity, color: 'text-red-600' },
  { value: 'treatment', label: 'Treatment', icon: Heart, color: 'text-green-600' },
  { value: 'prescription', label: 'Prescription', icon: Pill, color: 'text-purple-600' },
  { value: 'lab_result', label: 'Lab Result', icon: ClipboardList, color: 'text-orange-600' },
  { value: 'other', label: 'Other', icon: FileText, color: 'text-gray-600' }
];

// ---------- Main Component ----------
export default function PatientRecordsIndex() {
  const { auth } = usePage().props as any;
  const currentUser = auth?.user;

  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [toothRecords, setToothRecords] = useState<ToothRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    record_type: '',
    date_from: '',
    date_to: '',
    search: ''
  });
  const [stats, setStats] = useState({
    total: 0,
    thisMonth: 0,
    consultations: 0,
    prescriptions: 0,
    totalToothRecords: 0
  });

  // ---------- API Functions ----------
  const fetchRecords = async () => {
    try {
      setLoading(true);
      
      // Fetch medical records
      const response = await apiPatient.getMyMedicalRecords(filters);

      let recordsList = [];
      let statsData = {};

      if (response?.data) {
        // Handle paginated response: response.data.data
        recordsList = Array.isArray(response.data) ? response.data :
                     (response.data.data || response.data.records || []);
        statsData = response.data.stats || response.stats || {};
      } else {
        // Handle non-paginated or simpler response structures
        recordsList = response?.records || response || [];
        statsData = response?.stats || {};
      }

      // Ensure recordsList is an array (crucial for .filter/.map)
      if (!Array.isArray(recordsList)) {
        console.warn('Records data is not an array:', recordsList);
        recordsList = [];
      }

      setRecords(recordsList);

      // Fetch tooth records for this patient
      let toothRecordsList: ToothRecord[] = [];
      try {
        const toothRecordsResponse = await apiPatient.getMyToothRecords(currentUser?.id);
        toothRecordsList = Array.isArray(toothRecordsResponse?.records) 
          ? toothRecordsResponse.records 
          : (Array.isArray(toothRecordsResponse?.data) 
            ? toothRecordsResponse.data 
            : []);
        
        setToothRecords(toothRecordsList);
      } catch (error) {
        console.error('Error fetching tooth records:', error);
        toothRecordsList = [];
        setToothRecords([]);
      }

      // Calculate stats
      if (statsData && Object.keys(statsData).length > 0) {
        setStats({
          total: Number(statsData.total || 0),
          thisMonth: Number(statsData.thisMonth || 0),
          consultations: Number(statsData.consultations || 0),
          prescriptions: Number(statsData.prescriptions || 0),
          totalToothRecords: toothRecordsList.length
        });
      } else {
        // Fallback: calculate stats locally if API does not provide them
        const now = new Date();
        const thisMonth = recordsList.filter((r: MedicalRecord) => {
          // Use safer date parsing for local calculation
          const recordDate = new Date(r.record_date.split('T')[0]);
          return recordDate.getMonth() === now.getMonth() &&
                 recordDate.getFullYear() === now.getFullYear();
        }).length;

        const consultations = recordsList.filter((r: MedicalRecord) =>
          r.record_type === 'consultation'
        ).length;

        const prescriptions = recordsList.filter((r: MedicalRecord) =>
          r.record_type === 'prescription'
        ).length;

        setStats({
          total: recordsList.length,
          thisMonth,
          consultations,
          prescriptions,
          totalToothRecords: toothRecordsList.length
        });
      }
    } catch (error) {
      console.error('Error fetching records:', error);
      // ALIGNMENT FIX: Use the utility method from ApiPatient.ts for toast notification
      apiPatient.showErrorToast('Failed to load medical records. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [filters.record_type, filters.date_from, filters.date_to]);

  // ---------- Handlers ----------
  const handleViewDetails = (record: MedicalRecord) => {
    setSelectedRecord(record);
    setShowDetailsModal(true);
  };

  const handleViewToothRecords = () => {
    window.location.href = `/patient/tooth-records`;
  };

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ record_type: '', date_from: '', date_to: '', search: '' });
    // Re-fetch data on clear
    setTimeout(fetchRecords, 0);
  };

  // ---------- Helper Functions ----------
  // FIX: Robust date formatting to prevent timezone shifts
  const formatDate = (date: string) => {
    try {
      // 1. Extract only the date part (YYYY-MM-DD) if it contains a timestamp (T).
      // 2. Creating a Date object from YYYY-MM-DD string is usually interpreted as local time (safer).
      const cleanDateString = date.split('T')[0];
      const dateObj = new Date(cleanDateString);

      if (isNaN(dateObj.getTime())) {
        return date;
      }

      return dateObj.toLocaleDateString('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (e) {
      console.error('Error formatting date:', e);
      return date;
    }
  };

  // FIX: Robust date/time formatting to prevent UTC/Z shifts
  const formatDateTime = (date: string) => {
    try {
      // 1. Remove 'Z' if present, to instruct the Date object to treat the string as a local timestamp,
      //    avoiding conversion to the client's timezone which often causes time shifts.
      let dateTimeString = date;
      if (dateTimeString.endsWith('Z')) {
        dateTimeString = dateTimeString.slice(0, -1);
      }

      const dateTime = new Date(dateTimeString);

      if (isNaN(dateTime.getTime())) {
        return date;
      }

      return dateTime.toLocaleString('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      console.error('Error formatting date/time:', e);
      return date;
    }
  };

  const formatTime = (date: string) => {
    try {
      let dateString = date;
      if (dateString.endsWith('Z')) {
        dateString = dateString.slice(0, -1);
      }
      const dateObj = new Date(dateString);
      if (isNaN(dateObj.getTime())) {
        return date;
      }
      return dateObj.toLocaleTimeString('en-PH', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      console.error('Error formatting time:', e);
      return date;
    }
  };

  const getRecordTypeConfig = (type: string) => {
    return recordTypes.find(t => t.value === type) || recordTypes[recordTypes.length - 1];
  };

  // Filter records by search (this is client-side searching, usually augmented by server-side filtering)
  const filteredRecords = records.filter(record => {
    if (!filters.search) return true;
    const searchLower = filters.search.toLowerCase();
    return (
      record.diagnosis?.toLowerCase().includes(searchLower) ||
      record.treatment?.toLowerCase().includes(searchLower) ||
      record.doctor.name.toLowerCase().includes(searchLower) ||
      record.record_type.toLowerCase().includes(searchLower)
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
              <h1 className="text-2xl font-bold text-gray-900">Medical Records</h1>
              <p className="text-gray-600 mt-1">View your complete medical history</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleViewToothRecords}
                className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Smile className="w-4 h-4" />
                View Service Transactions
              </button>
              <button
                onClick={fetchRecords}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Records</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <FileText className="w-8 h-8 text-gray-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-blue-600">{stats.thisMonth}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Consultations</p>
                <p className="text-2xl font-bold text-green-600">{stats.consultations}</p>
              </div>
              <Stethoscope className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Prescriptions</p>
                <p className="text-2xl font-bold text-purple-600">{stats.prescriptions}</p>
              </div>
              <Pill className="w-8 h-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Service Transactions</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalToothRecords}</p>
              </div>
              <Smile className="w-8 h-8 text-blue-600" />
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
                  placeholder="Search records..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <select
                value={filters.record_type}
                onChange={(e) => handleFilterChange('record_type', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                {recordTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
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

        {/* Records List */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-8">
          <div className="border-b border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900">Medical Records</h2>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mr-2" />
              <span className="text-gray-600">Loading records...</span>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="w-16 h-16 text-gray-300 mb-4" />
              <p className="text-gray-600 font-medium">No medical records found</p>
              <p className="text-gray-400 text-sm mt-1">Your medical history will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredRecords.map(record => {
                const typeConfig = getRecordTypeConfig(record.record_type);
                const TypeIcon = typeConfig.icon;

                return (
                  <div
                    key={record.id}
                    className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => handleViewDetails(record)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="text-lg font-semibold text-gray-900">{record.diagnosis || typeConfig.label}</h3>
                          <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${typeConfig.color}`}>
                            <TypeIcon className="w-3 h-3" />
                            {typeConfig.label}
                          </span>
                          {record.appointment && (
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                              Linked Appointment
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span>Dr. {record.doctor.name}</span>
                            {record.doctor.specialization && (
                              <span className="text-gray-400">• {record.doctor.specialization}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span>{formatDate(record.record_date)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span>{formatTime(record.record_date)}</span>
                          </div>
                          {record.treatment && (
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <span className="text-gray-700 truncate">{record.treatment}</span>
                            </div>
                          )}
                        </div>

                        {(record.prescriptions || record.notes) && (
                          <div className="mt-3 text-sm text-gray-600">
                            <span className="font-medium">Prescription: </span>
                            <span>{record.prescriptions || record.notes}</span>
                          </div>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Tooth Records Section */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="border-b border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900">Service Transactions</h2>
            <p className="text-gray-600 text-sm mt-1">Treatment history for individual teeth</p>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mr-2" />
              <span className="text-gray-600">Loading service transactions...</span>
            </div>
          ) : toothRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Smile className="w-16 h-16 text-gray-300 mb-4" />
              <p className="text-gray-600 font-medium">No service transactions found</p>
              <p className="text-gray-400 text-sm mt-1">Tooth treatment records will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {toothRecords.map((record) => (
                <div key={record.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-lg font-semibold text-gray-900">Tooth #{record.tooth_number}</h3>
                        <span className="inline-flex px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          {record.service}
                        </span>
                        {record.financial_record_id && (
                          <span className="inline-flex px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                            Transaction #{record.financial_record_id}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span>Dr. {record.doctor?.name || 'Unknown'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span>{formatDate(record.date_done)}</span>
                        </div>
                      </div>

                      {record.notes && (
                        <div className="mt-3 text-sm text-gray-600">
                          <span className="font-medium">Notes: </span>
                          <span>{record.notes}</span>
                        </div>
                      )}

                      {record.financial_record_id && record.financialRecord && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-sm font-medium text-gray-700">Transaction Information</p>
                          <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                            <span>Amount: <span className="font-medium text-gray-900">₱{Number(record.financialRecord.amount).toFixed(2)}</span></span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              record.financialRecord.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                              record.financialRecord.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {record.financialRecord.payment_status.charAt(0).toUpperCase() + record.financialRecord.payment_status.slice(1)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedRecord && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">{formatDateTime(selectedRecord.record_date)}</p>
                  <h2 className="text-2xl font-semibold text-gray-900">{getRecordTypeConfig(selectedRecord.record_type).label}</h2>
                  <p className="text-sm text-gray-500 mt-1">Medical Record Details</p>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Record Type */}
              <div>
                <label className="text-sm font-medium text-gray-700">Record Type</label>
                <div className="mt-2">
                  <span className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-purple-50 text-purple-700">
                    {React.createElement(getRecordTypeConfig(selectedRecord.record_type).icon, { className: 'w-4 h-4' })}
                    {getRecordTypeConfig(selectedRecord.record_type).label}
                  </span>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Doctor Info */}
                <div>
                  <label className="text-sm font-medium text-gray-700">Attending Physician</label>
                  <div className="mt-2 flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Dr. {selectedRecord.doctor.name}</p>
                      {selectedRecord.doctor.specialization && (
                        <p className="text-sm text-gray-600">{selectedRecord.doctor.specialization}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Record Meta */}
                <div>
                  <label className="text-sm font-medium text-gray-700">Record Details</label>
                  <div className="mt-2 bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-gray-500">Date</p>
                        <p className="text-gray-900 font-medium">{formatDate(selectedRecord.record_date)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-gray-500">Time</p>
                        <p className="text-gray-900 font-medium">{formatTime(selectedRecord.record_date)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-gray-500">Record ID</p>
                        <p className="text-gray-900 font-medium">#{selectedRecord.id}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Diagnosis */}
              <div>
                <label className="text-sm font-medium text-gray-700">Diagnosis</label>
                <div className="mt-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-gray-900">{selectedRecord.diagnosis}</p>
                </div>
              </div>

              {/* Treatment */}
              {selectedRecord.treatment && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Treatment Plan</label>
                  <div className="mt-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-gray-900 whitespace-pre-wrap">{selectedRecord.treatment}</p>
                  </div>
                </div>
              )}

              {/* Prescription */}
              {(selectedRecord.prescriptions || selectedRecord.notes) && (
                <div>
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Pill className="w-4 h-4" />
                    Prescription
                  </label>
                  <div className="mt-2 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-gray-900 whitespace-pre-wrap">
                      {selectedRecord.prescriptions || selectedRecord.notes}
                    </p>
                  </div>
                </div>
              )}

              {/* Appointment Link */}
              {selectedRecord.appointment && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>Related Appointment: {formatDate(selectedRecord.appointment.appointment_date)}</span>
                  </div>
                </div>
              )}

              {/* Info Banner */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900 text-sm">Medical Record Information</p>
                    <p className="text-sm text-blue-700 mt-1">
                      This is a confidential medical record. If you have questions or need clarification,
                      please contact your healthcare provider.
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    console.log('Download record:', selectedRecord.id);
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
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
