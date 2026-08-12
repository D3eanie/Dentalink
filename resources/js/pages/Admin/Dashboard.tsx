import React, { useState, useEffect, useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import apiAdmin from '@/services/ApiAdmin';
import Swal from 'sweetalert2';
import {
    LayoutGrid,
    Users,
    Calendar,
    PhilippinePeso,
    TrendingUp,
    TrendingDown,
    Activity,
    Clock,
    AlertTriangle,
    CheckCircle,
    XCircle,
    RefreshCw,
    Download,
    Eye,
    UserPlus,
    CalendarPlus,
    ArrowUpRight,
    ArrowDownRight,
    GitBranch,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Wrench
} from 'lucide-react';

// TypeScript interfaces
interface DashboardStats {
    total_patients: number;
    total_staff: number;
    appointments_today: number;
    appointments_this_week: number;
    transactions_today: number;
    financial_records_added_today: number;
    revenue_this_month: number;
    outstanding_balance: number;
    recent_registrations: number;
}

interface RecentAppointment {
    id: number;
    patient: {
        id: number;
        name: string;
    };
    doctor: {
        id: number;
        name: string;
    };
    service: {
        id: number;
        name: string;
    };
    appointment_date: string;
    appointment_time: string;
    status: string;
}

interface RecentActivity {
    id: number;
    performedBy: {
        id: number;
        name: string;
        role: string;
    };
    action: string;
    target_collection: string;
    target_id: number;
    timestamp: string;
    details: any;
}

interface TrendPoint {
    day: string;
    label: string;
    value: number;
}

interface PaymentSummaryItem {
    label: string;
    value: number;
}

interface NewUserSummary {
    id: number;
    name: string;
    email?: string;
    role?: string;
    created_at?: string;
}

interface BlockchainStatus {
    verification_status: 'verified' | 'pending' | 'failed';
    last_verification: string;
    chain_height: number;
    verification_enabled: boolean;
}

const breadcrumbs = [
    { title: 'Dashboard', href: '/admin/dashboard' }
];

export default function AdminDashboard() {
    const [stats, setStats] = useState<DashboardStats>({
        total_patients: 0,
        total_staff: 0,
        appointments_today: 0,
        appointments_this_week: 0,
        transactions_today: 0,
        financial_records_added_today: 0,
        revenue_this_month: 0,
        outstanding_balance: 0,
        recent_registrations: 0
    });
    const [recentAppointments, setRecentAppointments] = useState<RecentAppointment[]>([]);
    const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
    const [appointmentTrend, setAppointmentTrend] = useState<TrendPoint[]>([]);
    const [paymentSummary, setPaymentSummary] = useState<PaymentSummaryItem[]>([]);
    const [newUsers, setNewUsers] = useState<NewUserSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [blockchainStatus, setBlockchainStatus] = useState<BlockchainStatus>({
        verification_status: 'verified',
        last_verification: new Date().toLocaleString(),
        chain_height: 0,
        verification_enabled: true
    });
    const [blockchainVerifying, setBlockchainVerifying] = useState(false);
    const [generatingReport, setGeneratingReport] = useState(false);
    const [repairingData, setRepairingData] = useState(false);

    // Helper function to unwrap response data
    const unwrapData = (response: any, key: string) => {
        if (!response) return null;
        if (response[key]) return response[key];
        if (response.data?.[key]) return response.data[key];
        return response.data || response;
    };

    // Fetch dashboard data
    const fetchDashboardData = async () => {
        try {
            setLoading(true);

            // Try to get dashboard data from API
            let dashboardResponse;
            try {
                dashboardResponse = await apiAdmin.getDashboardData();
            } catch (dashboardError) {
                console.warn('Dashboard API failed, fetching individual components:', dashboardError);
                // Fallback: fetch individual components
                dashboardResponse = await fetchFallbackData();
            }

            console.log('Dashboard response:', dashboardResponse);

            // Extract stats
            const statsData = unwrapData(dashboardResponse, 'stats');
            if (statsData) {
                setStats({
                    total_patients: Number(statsData.total_patients || 0),
                    total_staff: Number(statsData.total_staff || 0),
                    appointments_today: Number(statsData.appointments_today || 0),
                    appointments_this_week: Number(statsData.appointments_this_week || 0),
                    transactions_today: Number(statsData.transactions_today || 0),
                    financial_records_added_today: Number(statsData.financial_records_added_today || 0),
                    revenue_this_month: Number(statsData.revenue_this_month || 0),
                    outstanding_balance: Number(statsData.outstanding_balance || 0),
                    recent_registrations: Number(statsData.recent_registrations || 0)
                });
            }

            // Extract recent appointments
            const appointmentsData = unwrapData(dashboardResponse, 'recentAppointments');
            if (Array.isArray(appointmentsData)) {
                setRecentAppointments(appointmentsData.slice(0, 10));
            }

            // Extract recent activities
            const activitiesData = unwrapData(dashboardResponse, 'recentActivities');
            if (Array.isArray(activitiesData)) {
                setRecentActivities(activitiesData.slice(0, 10));
            }

            const trendData = unwrapData(dashboardResponse, 'appointmentTrend');
            if (Array.isArray(trendData)) {
                setAppointmentTrend(trendData);
            }

            const paymentSummaryData = unwrapData(dashboardResponse, 'paymentSummary');
            if (Array.isArray(paymentSummaryData)) {
                setPaymentSummary(paymentSummaryData);
            }

            const newUsersData = unwrapData(dashboardResponse, 'newUsers');
            if (Array.isArray(newUsersData)) {
                setNewUsers(newUsersData);
            }

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            // Try fallback approach
            await fetchFallbackData();
        } finally {
            setLoading(false);
        }
    };

    // Fallback: fetch data from individual endpoints
    const fetchFallbackData = async () => {
        try {
            console.log('[Dashboard] Starting fetchFallbackData...');
            console.log('[Dashboard] API Admin instance:', apiAdmin);
            const [usersRes, appointmentsRes, financialRes] = await Promise.allSettled([
                apiAdmin.getUsers({}),
                apiAdmin.getAppointments({
                    date: new Date().toISOString().split('T')[0],
                    limit: 10
                }),
                apiAdmin.getFinancialRecords({ limit: 5 })
            ]);

            console.log('[Dashboard] Promise.allSettled results:');
            console.log('[Dashboard] usersRes:', usersRes);
            console.log('[Dashboard] appointmentsRes:', appointmentsRes);
            console.log('[Dashboard] financialRes:', financialRes);

            // Process users data for stats
            if (usersRes.status === 'fulfilled') {
                const userData = usersRes.value;
                const users = Array.isArray(userData?.data) ? userData.data :
                             Array.isArray(userData?.users) ? userData.users :
                             Array.isArray(userData) ? userData : [];

                const patients = users.filter((u: any) => u.role === 'patient');
                const staff = users.filter((u: any) => u.role === 'staff' || u.role === 'admin');

                setStats(prev => ({
                    ...prev,
                    total_patients: patients.length,
                    total_staff: staff.length
                }));

                setNewUsers(
                    users
                        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        .slice(0, 6)
                        .map((user: any) => ({
                            id: user.id,
                            name: user.name,
                            email: user.email,
                            role: user.role,
                            created_at: user.created_at,
                        }))
                );
            }

            // Process appointments data
            if (appointmentsRes.status === 'fulfilled') {
                const appointmentData = appointmentsRes.value;
                const appointments = Array.isArray(appointmentData?.data) ? appointmentData.data :
                                    Array.isArray(appointmentData?.appointments) ? appointmentData.appointments :
                                    Array.isArray(appointmentData) ? appointmentData : [];

                setRecentAppointments(appointments.slice(0, 10));
                setStats(prev => ({
                    ...prev,
                    appointments_today: appointments.length
                }));

                const fallbackTrend = buildTrendFromAppointments(appointments);
                if (fallbackTrend.length) {
                    setAppointmentTrend(fallbackTrend);
                }

                if (!appointmentTrend.length && fallbackTrend.length) {
                    setAppointmentTrend(fallbackTrend);
                }
            }

            // Process financial data
            if (financialRes.status === 'fulfilled') {
                const financialData = financialRes.value;
                const records = Array.isArray(financialData?.data) ? financialData.data :
                               Array.isArray(financialData?.records) ? financialData.records :
                               Array.isArray(financialData) ? financialData : [];

                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const recordsAddedToday = records.filter((r: any) => {
                    const createdDate = new Date(r.created_at);
                    createdDate.setHours(0, 0, 0, 0);
                    return createdDate.getTime() === today.getTime();
                }).length;

                const thisMonth = new Date().getMonth();
                const monthlyRevenue = records
                    .filter((r: any) => {
                        const recordDate = new Date(r.transaction_date || r.created_at);
                        return recordDate.getMonth() === thisMonth;
                    })
                    .reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);

                const outstanding = records
                    .filter((r: any) => Number(r.balance || 0) > 0)
                    .reduce((sum: number, r: any) => sum + Number(r.balance || 0), 0);

                setStats(prev => ({
                    ...prev,
                    financial_records_added_today: recordsAddedToday,
                    revenue_this_month: monthlyRevenue,
                    outstanding_balance: outstanding
                }));

                const paidTotal = records
                    .reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);

                const dueTotal = records
                    .reduce((sum: number, r: any) => sum + Number(r.balance || 0), 0);

                setPaymentSummary([
                    { label: 'Paid', value: paidTotal },
                    { label: 'Due', value: dueTotal },
                ]);
            }

            return { stats, recentAppointments, recentActivities };
        } catch (error) {
            console.error('Fallback data fetch error:', error);
            return {};
        }
    };

    // Fetch blockchain statistics
    const fetchBlockchainStatistics = async () => {
        try {
            const response = await apiAdmin.getBlockchainStatistics();
            const statistics = response.statistics || response;

            if (statistics) {
                setBlockchainStatus(prev => ({
                    ...prev,
                    chain_height: statistics.total_financial_records || 0,
                    last_verification: statistics.last_verification?.verified_at
                        ? new Date(statistics.last_verification.verified_at).toLocaleString()
                        : prev.last_verification,
                    verification_status: statistics.last_verification?.chain_valid ? 'verified' : 'error'
                }));
            }
        } catch (error) {
            console.error('Error fetching blockchain statistics:', error);
            // Keep default values on error
        }
    };

    useEffect(() => {
        fetchDashboardData();
        fetchBlockchainStatistics();
    }, []);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchDashboardData();
        setRefreshing(false);
    };

    const handleBlockchainVerification = async () => {
        try {
            setBlockchainVerifying(true);

            // Call actual blockchain verification API with JSON cross-check
            const result = await apiAdmin.verifyFinancialBlockchainChain();
            const verification = result.verification || result;

            if (verification.overall_valid) {
                const jsonInfo = verification.json_backup_verification;
                await Swal.fire({
                    icon: 'success',
                    title: 'Blockchain Verified Successfully!',
                    html: `
                        <div class="text-left">
                            <p><strong>Total Records:</strong> ${verification.total_records}</p>
                            <p><strong>Verified Records:</strong> ${verification.verified_records}</p>
                            <hr class="my-2"/>
                            <p class="font-semibold">JSON Backup Cross-Check:</p>
                            <p><strong>JSON Records:</strong> ${jsonInfo.total_json_records}</p>
                            <p><strong>Database Records:</strong> ${jsonInfo.total_db_records}</p>
                            <p><strong>Matched Records:</strong> ${jsonInfo.matched_records}</p>
                            ${jsonInfo.mismatched_data.length > 0 ? `<p class="text-yellow-600"><strong>Mismatches:</strong> ${jsonInfo.mismatched_data.length}</p>` : ''}
                        </div>
                    `,
                    confirmButtonColor: '#10B981'
                });

                setBlockchainStatus({
                    ...blockchainStatus,
                    last_verification: new Date().toLocaleString(),
                    verification_status: 'verified',
                    chain_height: verification.total_records || blockchainStatus.chain_height
                });

                // Refresh blockchain statistics to get updated chain height
                await fetchBlockchainStatistics();
            } else {
                const jsonInfo = verification.json_backup_verification;
                await Swal.fire({
                    icon: 'error',
                    title: 'Verification Failed!',
                    html: `
                        <div class="text-left">
                            <p><strong>Blockchain Issues:</strong></p>
                            <p>Tampered Records: ${verification.tampered_records}</p>
                            <hr class="my-2"/>
                            <p><strong>JSON Backup Issues:</strong></p>
                            <ul class="list-disc pl-5">
                                ${jsonInfo.issues.map((issue: string) => `<li>${issue}</li>`).join('')}
                            </ul>
                        </div>
                    `,
                    confirmButtonColor: '#EF4444'
                });

                setBlockchainStatus({
                    ...blockchainStatus,
                    verification_status: 'failed'
                });

                // Refresh blockchain statistics even on failure to get current chain height
                await fetchBlockchainStatistics();
            }
        } catch (error) {
            console.error('Blockchain verification failed:', error);
            await Swal.fire({
                icon: 'error',
                title: 'Verification Error',
                text: 'Failed to verify blockchain. Please try again.',
                confirmButtonColor: '#EF4444'
            });
            setBlockchainStatus({
                ...blockchainStatus,
                verification_status: 'failed'
            });

            // Try to refresh blockchain statistics even on error
            try {
                await fetchBlockchainStatistics();
            } catch (statsError) {
                console.error('Failed to refresh blockchain statistics:', statsError);
            }
        } finally {
            setBlockchainVerifying(false);
        }
    };

    const handleDataIntegrityRepair = async() => {
        // Show confirmation dialog with warning
        const confirmResult = await Swal.fire({
            title: '⚠️ Factory Reset Warning',
            html: `
                <div class="text-left space-y-3">
                    <p class="font-semibold text-red-600">This will FACTORY RESET the financial_records table!</p>
                    <p>The repair process will:</p>
                    <ol class="list-decimal pl-5 space-y-2">
                        <li><strong>DELETE ALL</strong> existing financial records from database</li>
                        <li><strong>RESET</strong> auto-increment counter (IDs start from 1)</li>
                        <li><strong>RESTORE</strong> all records from JSON backup file</li>
                        <li><strong>REBUILD</strong> blockchain hashes automatically</li>
                        <li><strong>VERIFY</strong> blockchain integrity</li>
                    </ol>
                    <p class="text-red-600 font-semibold mt-3">⚠️ THIS ACTION CANNOT BE UNDONE!</p>
                    <p class="text-sm text-gray-600">Make sure you have a database backup before proceeding.</p>
                </div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'YES, PROCEED',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#DC2626',
            cancelButtonColor: '#6B7280',
            width: '600px'
        });

        if (!confirmResult.isConfirmed) {
            return;
        }

        try {
            setRepairingData(true);

            // Show loading alert
            Swal.fire({
                title: 'Factory Reset in Progress...',
                html: 'Please wait while the system deletes all records, restores from backup, and rebuilds blockchain hashes.',
                allowOutsideClick: false,
                allowEscapeKey: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            // Call repair API
            const result = await apiAdmin.repairDataIntegrity();

            if (result.success) {
                const summary = result.result?.summary || {};
                await Swal.fire({
                    icon: 'success',
                    title: 'Factory Reset Completed!',
                    html: `
                        <div class="text-left space-y-2">
                            <p class="font-semibold">Factory Reset Summary:</p>
                            <ul class="list-disc pl-5">
                                <li><strong>Records Deleted:</strong> ${summary.records_deleted || 0}</li>
                                <li><strong>Records Restored:</strong> ${summary.records_restored || 0}</li>
                                <li><strong>Errors:</strong> ${summary.errors_encountered || 0}</li>
                            </ul>
                            <p class="mt-3 text-green-600 font-semibold">✓ Blockchain hashes rebuilt successfully</p>
                            <p class="text-green-600">✓ Database integrity verified</p>
                            <p class="text-sm text-gray-600 mt-2">Check the detailed log in: storage/logs/integrity_repairs/</p>
                        </div>
                    `,
                    confirmButtonColor: '#10B981',
                    width: '600px'
                });

                // Refresh blockchain status and chain height
                setBlockchainStatus({
                    ...blockchainStatus,
                    last_verification: new Date().toLocaleString(),
                    verification_status: 'verified'
                });
                await fetchBlockchainStatistics();

                // Refresh dashboard data
                await fetchDashboardData();
            } else {
                await Swal.fire({
                    icon: 'error',
                    title: 'Repair Failed',
                    html: `
                        <div class="text-left">
                            <p>Failed to repair data integrity.</p>
                            ${result.result?.errors ? `<p class="mt-2"><strong>Errors:</strong></p><ul class="list-disc pl-5">${result.result.errors.slice(0, 5).map((err: string) => `<li>${err}</li>`).join('')}</ul>` : ''}
                        </div>
                    `,
                    confirmButtonColor: '#EF4444'
                });
            }
        } catch (error: any) {
            console.error('Data integrity repair failed:', error);
            await Swal.fire({
                icon: 'error',
                title: 'Repair Error',
                text: error.message || 'Failed to repair data integrity. Please try again or check server logs.',
                confirmButtonColor: '#EF4444'
            });
        } finally {
            setRepairingData(false);
        }
    };

    const handleGenerateBlockchainReport = async () => {
        try {
            setGeneratingReport(true);

            // Generate detailed report data
            const result = await apiAdmin.generateDetailedBlockchainVerificationReport();
            const report = result.report || result?.data?.report || result;

            if (!report || report.success === false) {
                throw new Error('Detailed verification report generation failed.');
            }

            const summary = report.summary || {};
            const stats = report.cross_check_statistics || {};
            const analysis = report.tampered_records_analysis || {};
            const deletedDetails = analysis.deleted_records_detail || [];
            const editedDetails = analysis.edited_records_detail || [];
            const orphanedDetails = analysis.orphaned_records_detail || [];
            const chainViolations = analysis.chain_violations || [];

            const formatValue = (value: any) => {
                if (value === null || value === undefined) return 'N/A';
                return typeof value === 'string' ? value : JSON.stringify(value);
            };

            const isVerified = report.success && (summary.total_tampering_detected || 0) === 0;
            const editedDetailsFiltered = editedDetails.filter((record: any) => {
                const editedFields = Object.keys(record.edited_fields || {});
                return editedFields.some((field) => ['amount', 'patient_id', 'appointment_id', 'id'].includes(field));
            });

            // Create comprehensive CSV content with before/after comparisons
            const csvContent = `
BLOCKCHAIN VERIFICATION & AUDIT TRAIL REPORT
Generated: ${report.generated_at || new Date().toLocaleString()}

OVERALL STATUS
=====================
Status: ${isVerified ? 'VERIFIED' : 'FAILED'}
Overall Integrity: ${isVerified ? 'PASSED' : 'FAILED'}

SUMMARY
=====================
Total DB Records: ${summary.total_db_records || 0}
Total JSON Records: ${summary.total_json_records || 0}
Deleted Records: ${(summary.deleted_records || []).length}
Edited Records: ${(summary.edited_records || []).length}
Orphaned Records: ${(summary.orphaned_records || []).length}
Integrity Violations: ${(summary.integrity_violations || []).length}
Total Tampering Detected: ${summary.total_tampering_detected || 0}

CROSS-CHECK STATISTICS (JSON vs Database)
=====================
Total Matching Records: ${stats.total_matching_records || 0}
Total Records with Differences: ${stats.total_records_with_differences || 0}
Total Deleted Records: ${stats.total_deleted_records || 0}
Total Orphaned Records: ${stats.total_orphaned_records || 0}
Total Chain Violations: ${stats.total_chain_violations || 0}
Integrity Match Percentage: ${stats.integrity_match_percentage || 0}%
Hash Validation Matches: ${stats.hash_validation_match_count || 0}
Hash Validation Failures: ${stats.hash_validation_failed_count || 0}
Data Integrity Status: ${stats.data_integrity_status || 'UNKNOWN'}

DELETED RECORDS (JSON exists, DB missing)
=====================
${deletedDetails.length === 0 ? 'None' : deletedDetails.map((record: any) => `
Record ID: ${record.id}
Status: ${record.status || 'DELETED_FROM_DATABASE'}
Detected: ${formatValue(record.detected_at)}
`).join('\n')}

EDITED RECORDS (JSON vs DB)
=====================
${editedDetailsFiltered.length === 0 ? 'None' : editedDetailsFiltered.map((record: any) => `
Record ID: ${record.id}
Status: ${record.status || 'EDITED_IN_DATABASE'}
Fields Modified: ${record.fields_count || 0}
Field Changes:
${record.edited_fields && Object.keys(record.edited_fields).length > 0 ? Object.entries(record.edited_fields).map(([field, change]: any) => `  - ${field}
    JSON (before): ${formatValue(change.before)}
    DB (after): ${formatValue(change.after)}`).join('\n') : '  (No field diff details)'}
Chain Violation: ${record.chain_violation ? 'YES' : 'NO'}
Detected: ${formatValue(record.detected_at)}
`).join('\n')}

ORPHANED RECORDS (DB exists, JSON missing)
=====================
${orphanedDetails.length === 0 ? 'None' : orphanedDetails.map((record: any) => `
Record ID: ${record.id}
Status: ${record.status || 'ORPHANED_IN_DATABASE'}
JSON (before): MISSING
DB (after):
  patient_id: ${formatValue(record.patient_id)}
  appointment_id: ${formatValue(record.appointment_id)}
  amount: ${formatValue(record.amount)}
  balance: ${formatValue(record.balance)}
  payment_method: ${formatValue(record.payment_method)}
  transaction_date: ${formatValue(record.transaction_date)}
  description: ${formatValue(record.description)}
  notes: ${formatValue(record.notes)}
  blockchain_hash: ${formatValue(record.blockchain_hash)}
Detected: ${formatValue(record.detected_at)}
`).join('\n')}

CHAIN VIOLATIONS
=====================
${chainViolations.length === 0 ? 'None' : chainViolations.map((violation: any) => `
Record ID: ${violation.id}
Patient ID: ${formatValue(violation.patient_id)}
Amount: ${formatValue(violation.amount)}
Issues:
${(violation.issues || []).map((issue: string) => `  - ${issue}`).join('\n')}
`).join('\n')}

RECOMMENDATIONS
=====================
1. Investigate any edited or deleted records immediately
2. Compare JSON backup with database for every tampered record
3. Restore deleted records from JSON backup if appropriate
4. Rebuild blockchain hashes after repair actions
5. Run daily verification and archive reports

Generated by JTIMIS Blockchain Verification System
Financial Records Audit Trail Module v2.1
            `.trim();

            // Download the report
            const element = document.createElement('a');
            element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent));
            element.setAttribute('download', `blockchain-audit-trail-report-${new Date().toISOString().split('T')[0]}.csv`);
            element.style.display = 'none';
            document.body.appendChild(element);
            element.click();
            element.remove();

            // Show success message
            await Swal.fire({
                icon: 'success',
                title: 'Report Generated!',
                text: 'Blockchain verification and audit trail report has been downloaded.',
                confirmButtonColor: '#10B981',
                timer: 3000
            });
        } catch (error) {
            console.error('Report generation failed:', error);
            await Swal.fire({
                icon: 'error',
                title: 'Report Generation Failed',
                text: 'Failed to generate report. Please try again.',
                confirmButtonColor: '#EF4444'
            });
        } finally {
            setGeneratingReport(false);
        }
    };

    // Helper functions
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
            minimumFractionDigits: 2
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(dateString));
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            scheduled: 'bg-blue-100 text-blue-800',
            confirmed: 'bg-green-100 text-green-800',
            not_available: 'bg-gray-100 text-gray-800',
            completed: 'bg-gray-100 text-gray-800',
            cancelled: 'bg-red-100 text-red-800',
            no_show: 'bg-orange-100 text-orange-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const getActionIcon = (action: string) => {
        const icons: Record<string, JSX.Element> = {
            create: <UserPlus className="w-4 h-4 text-green-600" />,
            update: <RefreshCw className="w-4 h-4 text-blue-600" />,
            delete: <XCircle className="w-4 h-4 text-red-600" />,
            complete: <CheckCircle className="w-4 h-4 text-green-600" />,
            cancel: <XCircle className="w-4 h-4 text-orange-600" />
        };
        return icons[action] || <Activity className="w-4 h-4 text-gray-600" />;
    };

    const buildTrendFromAppointments = (appointments: any[]): TrendPoint[] => {
        const today = new Date();
        const buckets: Record<string, TrendPoint> = {};

        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const key = date.toISOString().slice(0, 10);
            buckets[key] = {
                day: date.toLocaleDateString('en-US', { weekday: 'short' }),
                label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                value: 0,
            };
        }

        appointments.forEach((appointment: any) => {
            if (!appointment.appointment_date) return;
            // Extract YYYY-MM-DD directly without timezone conversion
            const key = appointment.appointment_date.split('T')[0];
            if (buckets[key]) {
                buckets[key].value += 1;
            }
        });

        return Object.values(buckets);
    };

    const maxTrendValue = useMemo(
        () => Math.max(1, ...appointmentTrend.map(point => point.value)),
        [appointmentTrend]
    );

    const totalPaymentValue = useMemo(
        () => {
            const total = paymentSummary.reduce((sum, item) => sum + (item.value || 0), 0);
            return total <= 0 ? 1 : total;
        },
        [paymentSummary]
    );

    return (
        <AppLayout
            pageTitle="Admin Dashboard"
            breadcrumbs={breadcrumbs}
        >
        <div className="flex flex-col gap-6 p-6">
            <div className="space-y-">
                {/* Header with Refresh Button */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                        <p className="text-gray-600 mt-1">Welcome back! Here's what's happening today.</p>
                    </div>
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Total Patients */}
                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Patients</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {loading ? '...' : stats.total_patients.toLocaleString()}
                                </p>
                                <p className="text-xs text-green-600 flex items-center mt-1">
                                    <ArrowUpRight className="w-3 h-3 mr-1" />
                                    {stats.recent_registrations} new this month
                                </p>
                            </div>
                            <div className="p-3 bg-blue-100 rounded-full">
                                <Users className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                    </div>

                    {/* Transactions Today */}
                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Transactions Today</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {loading ? '...' : stats.transactions_today}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {stats.financial_records_added_today} records added
                                </p>
                            </div>
                            <div className="p-3 bg-green-100 rounded-full">
                                <PhilippinePeso className="w-6 h-6 text-green-600" />
                            </div>
                        </div>
                    </div>

                    {/* Total Staff */}
                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Staff</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {loading ? '...' : stats.total_staff}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    Active members
                                </p>
                            </div>
                            <div className="p-3 bg-orange-100 rounded-full">
                                <Users className="w-6 h-6 text-orange-600" />
                            </div>
                        </div>
                    </div>

                    {/* Revenue */}
                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {loading ? '...' : formatCurrency(stats.revenue_this_month)}
                                </p>
                                <p className="text-xs text-red-600 flex items-center mt-1">
                                    <ArrowDownRight className="w-3 h-3 mr-1" />
                                    {formatCurrency(stats.outstanding_balance)} outstanding
                                </p>
                            </div>
                            <div className="p-3 bg-purple-100 rounded-full">
                                <PhilippinePeso className="w-6 h-6 text-purple-600" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Blockchain Verification Widget */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <GitBranch className="w-5 h-5 text-blue-600" />
                                <h3 className="text-lg font-semibold text-gray-900">Blockchain Verification</h3>
                            </div>
                            <div className="mt-4 space-y-2">
                                <div className="flex items-center gap-2">
                                    {blockchainStatus.verification_status === 'verified' && (
                                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                                    )}
                                    {blockchainStatus.verification_status === 'pending' && (
                                        <Loader2 className="h-5 w-5 text-yellow-600 animate-spin" />
                                    )}
                                    {blockchainStatus.verification_status === 'failed' && (
                                        <AlertCircle className="h-5 w-5 text-red-600" />
                                    )}
                                    <span className="text-sm font-medium capitalize text-gray-700">
                                        Status: {blockchainStatus.verification_status}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600">
                                    <span className="font-medium">Chain Height:</span> {blockchainStatus.chain_height.toLocaleString()}
                                </p>
                                <p className="text-sm text-gray-600">
                                    <span className="font-medium">Last Verification:</span> {blockchainStatus.last_verification}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleBlockchainVerification}
                                disabled={blockchainVerifying}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                            >
                                {blockchainVerifying ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Verifying...
                                    </>
                                ) : (
                                    <>
                                        <GitBranch className="h-4 w-4" />
                                        Verify Now
                                    </>
                                )}
                            </button>
                            <button
                                onClick={handleDataIntegrityRepair}
                                disabled={repairingData}
                                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                title="Factory reset and restore from JSON backup"
                            >
                                {repairingData ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Repairing...
                                    </>
                                ) : (
                                    <>
                                        <Wrench className="h-4 w-4" />
                                        Repair Data
                                    </>
                                )}
                            </button>
                            <button
                                onClick={handleGenerateBlockchainReport}
                                disabled={generatingReport}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                            >
                                {generatingReport ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Download className="h-4 w-4" />
                                        Generate Report
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-blue-200">
                        <p className="text-sm text-gray-700">
                            <span className="font-semibold">Dual Audit Trail System:</span> Verifies both blockchain integrity
                            and cross-checks with encrypted JSON backup file to ensure complete data
                            integrity for all financial records.
                        </p>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Link
                            href="/admin/patients"
                            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <UserPlus className="w-8 h-8 text-blue-600" />
                            <div>
                                <p className="font-medium text-gray-900">Add Patient</p>
                                <p className="text-sm text-gray-600">Register new patient</p>
                            </div>
                        </Link>

                        <Link
                            href="/admin/appointments"
                            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <CalendarPlus className="w-8 h-8 text-green-600" />
                            <div>
                                <p className="font-medium text-gray-900">Book Appointment</p>
                                <p className="text-sm text-gray-600">Schedule new appointment</p>
                            </div>
                        </Link>

                        <Link
                            href="/admin/financial"
                            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <PhilippinePeso className="w-8 h-8 text-purple-600" />
                            <div>
                                <p className="font-medium text-gray-900">Add Transaction</p>
                                <p className="text-sm text-gray-600">Record payment</p>
                            </div>
                        </Link>

                        <Link
                            href="/admin/users"
                            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <Users className="w-8 h-8 text-orange-600" />
                            <div>
                                <p className="font-medium text-gray-900">Add Staff</p>
                                <p className="text-sm text-gray-600">Register staff member</p>
                            </div>
                        </Link>
                    </div>
                </div>

                {/* Tooth Records Widget removed per request */}

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <div className="bg-white rounded-lg border border-gray-200 p-6 xl:col-span-2">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Weekly Appointment Trend</h2>
                                <p className="text-sm text-gray-500">Number of appointments per day</p>
                            </div>
                            <TrendingUp className="w-5 h-5 text-blue-600" />
                        </div>
                        {appointmentTrend.length === 0 ? (
                            <div className="py-10 text-center text-gray-500">
                                No data available yet.
                            </div>
                        ) : (
                            <div className="flex items-end gap-3 h-56">
                                {appointmentTrend.map(point => (
                                    <div key={point.label} className="flex-1 flex flex-col items-center gap-2">
                                        <div className="relative w-full flex-1 flex items-end">
                                            <div
                                                className="w-full rounded-t-xl bg-gradient-to-t from-blue-500 to-blue-300 transition-all duration-300"
                                                style={{ height: `${(point.value / maxTrendValue) * 100}%` }}
                                            ></div>
                                        </div>
                                        <div className="text-xs font-medium text-gray-500">{point.day}</div>
                                        <div className="text-sm font-semibold text-gray-900">{point.value}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">New Users</h2>
                        {newUsers.length === 0 ? (
                            <p className="text-sm text-gray-500">No recent sign-ups yet.</p>
                        ) : (
                            <ul className="space-y-3">
                                {newUsers.map(user => (
                                    <li key={user.id} className="flex items-start justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                                            <p className="text-xs text-gray-500">
                                                {user.email || 'No email'} · {user.role ?? 'user'}
                                            </p>
                                        </div>
                                        <span className="text-xs text-gray-400">
                                            {user.created_at ? new Date(user.created_at).toLocaleDateString() : ''}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-lg border border-gray-200">
                        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-900">Payments Overview</h2>
                            <span className="text-sm text-gray-500">Paid vs Due</span>
                        </div>
                        <div className="p-6 space-y-4">
                            {paymentSummary.length === 0 ? (
                                <p className="text-sm text-gray-500 text-center">No payment data available.</p>
                            ) : (
                                paymentSummary.map(item => (
                                    <div key={item.label}>
                                        <div className="flex items-center justify-between text-sm font-medium text-gray-600 mb-1">
                                            <span>{item.label}</span>
                                            <span>{formatCurrency(item.value || 0)}</span>
                                        </div>
                                        <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${item.label === 'Paid' ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                                style={{
                                                    width: `${((item.value || 0) / totalPaymentValue) * 100}%`,
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-lg border border-gray-200">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-gray-900">Recent Activities</h2>
                            </div>
                        </div>
                        <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                            {loading ? (
                                <div className="p-6 text-center text-gray-500">
                                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                                    Loading...
                                </div>
                            ) : recentActivities.length === 0 ? (
                                <div className="p-6 text-center text-gray-500">
                                    No recent activities available
                                    <div className="mt-2 text-xs text-gray-400">
                                        Activities will appear here when users perform actions
                                    </div>
                                </div>
                            ) : (
                                recentActivities.map((activity) => (
                                    <div key={activity.id} className="p-4">
                                        <div className="flex items-start gap-3">
                                            <div className="flex-shrink-0 p-2 bg-gray-100 rounded-full">
                                                {getActionIcon(activity.action)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900">
                                                    {activity.performedBy?.name || 'System'}
                                                </p>
                                                <p className="text-sm text-gray-600">
                                                    {activity.action}d {activity.target_collection?.replace('_', ' ') || 'item'}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {formatDate(activity.timestamp)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        </AppLayout>
    );
}
