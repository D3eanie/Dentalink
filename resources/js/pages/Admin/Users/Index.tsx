import React, { useState, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import apiAdmin from '@/services/ApiAdmin';
import {
  Users,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  Download,
  Filter,
  UserPlus,
  Shield,
  ShieldOff,
  Key,
  MoreVertical,
  Mail,
  Phone,
  Calendar,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
  X,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

// ==================== TYPES ====================
interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'staff' | 'patient';
  is_active: boolean;
  status?: string;
  email_verified_at: string | null;
  phone?: string;
  created_at: string;
  last_login_at?: string;
  profile?: {
    avatar?: string;
    specialization?: string;
    department?: string;
  };
}

interface UserFilters {
  search: string;
  role: string;
  status: string;
  page: number;
  per_page: number;
}

interface PaginationMeta {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
  from: number;
  to: number;
}

interface UserFormData {
  name: string;
  email: string;
  password?: string;
  password_confirmation?: string;
  role: string;
  is_active: boolean;
  phone?: string;
  // Staff-specific fields
  employee_id?: string;
  position?: string;
  license_number?: string;
  license_expiry?: string;
  hire_date?: string;
  hourly_rate?: number;
  specializations?: string[];
  bio?: string;
  years_experience?: number;
}

// ==================== BREADCRUMBS ====================
const breadcrumbs = [
  { title: 'Dashboard', href: '/admin/dashboard' },
  { title: 'User Management', href: '/admin/users' }
];

// ==================== MAIN COMPONENT ====================
export default function UsersIndex() {
  // ---------- State ----------
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showFilters, setShowFilters] = useState(true);
  const [showActionMenu, setShowActionMenu] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  // Pagination
  const [pagination, setPagination] = useState<PaginationMeta>({
    current_page: 1,
    per_page: 15,
    total: 0,
    last_page: 1,
    from: 0,
    to: 0
  });

  // Filters
  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    role: '',
    status: '',
    page: 1,
    per_page: 15
  });

  // Form Data
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    role: 'patient',
    is_active: true,
    phone: '',
    // Staff-specific fields
    employee_id: '',
    position: '',
    license_number: '',
    license_expiry: '',
    hire_date: '',
    hourly_rate: undefined,
    specializations: [],
    bio: '',
    years_experience: undefined
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    admins: 0,
    staff: 0,
    patients: 0,
    active: 0,
    inactive: 0
  });

  // ---------- Helper Functions ----------
  
  // ✅ FIXED: Properly check if user is active
  const isUserActive = (user: User): boolean => {
    // Check both is_active boolean and status string
    if (typeof user.is_active === 'boolean') {
      return user.is_active;
    }
    if (user.status) {
      return user.status.toLowerCase() === 'active';
    }
    return false;
  };

  // ---------- Data Fetching ----------
  const fetchUsers = async (resetPage = false) => {
    try {
      setRefreshing(true);

      const params: Record<string, any> = {
        ...filters,
        page: resetPage ? 1 : filters.page
      };

      console.log('Fetching users with params:', params);

      const response = await apiAdmin.getUsers(params);
      console.log('Raw users response:', response);

      // Extract users data from various response structures
      let usersData: User[] = [];
      if (Array.isArray(response)) {
        usersData = response;
      } else if (Array.isArray(response?.data?.data)) {
        usersData = response.data.data;
      } else if (Array.isArray(response?.data)) {
        usersData = response.data;
      } else if (Array.isArray(response?.users)) {
        usersData = response.users;
      }

      console.log('Extracted users data:', usersData);
      setUsers(usersData);

      // Extract pagination
      const paginationData = response?.meta || response?.pagination || response?.data?.meta;
      if (paginationData) {
        setPagination({
          current_page: paginationData.current_page || filters.page,
          per_page: paginationData.per_page || filters.per_page,
          total: paginationData.total || usersData.length,
          last_page: paginationData.last_page || 1,
          from: paginationData.from || 1,
          to: paginationData.to || usersData.length
        });
      }

      // Calculate stats from users data
      calculateStats(usersData);
      
    } catch (error) {
      console.error('Error fetching users:', error);
      apiAdmin.showErrorToast('Failed to load users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiAdmin.getUserStats();
      console.log('Stats response:', response);
      
      const statsData = response?.data || response?.stats || response;
      
      setStats({
        total: statsData.total_users || statsData.total || 0,
        admins: statsData.total_admins || statsData.admins || 0, 
        staff: statsData.total_staff || statsData.staff || 0,
        patients: statsData.total_patients || statsData.patients || 0, 
        active: statsData.active_users || statsData.active || 0,
        inactive: statsData.inactive_users || statsData.inactive || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Calculate stats from users
  const calculateStats = (userList: User[]) => {
    const activeCount = userList.filter(u => isUserActive(u)).length;
    const inactiveCount = userList.filter(u => !isUserActive(u)).length;
    
    setStats({
      total: userList.length,
      admins: userList.filter(u => u.role === 'admin').length,
      staff: userList.filter(u => u.role === 'staff').length,
      patients: userList.filter(u => u.role === 'patient').length,
      active: activeCount,
      inactive: inactiveCount
    });
  };

  // ---------- Effects ----------
  useEffect(() => {
    fetchUsers();
    fetchStats();
  }, []);

  useEffect(() => {
    if (!loading) {
      const debounce = setTimeout(() => {
        fetchUsers(true);
      }, 500);
      return () => clearTimeout(debounce);
    }
  }, [filters.search, filters.role, filters.status, filters.per_page]);

  useEffect(() => {
    const handleClickOutside = () => setShowActionMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // ---------- Event Handlers ----------
  const handleFilterChange = (key: keyof UserFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
    setTimeout(() => fetchUsers(), 100);
  };

  const handleRefresh = () => {
    fetchUsers();
    fetchStats();
  };

  const handleCreate = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      password_confirmation: '',
      role: 'patient',
      is_active: true,
      phone: '',
      // Staff-specific fields
      employee_id: '',
      position: '',
      license_number: '',
      license_expiry: '',
      hire_date: '',
      hourly_rate: undefined,
      specializations: [],
      bio: '',
      years_experience: undefined
    });
    setFormErrors({});
    setShowPassword(false);
    setShowPasswordConfirm(false);
    setShowCreateModal(true);
  };

  const handleView = (user: User) => {
    setSelectedUser(user);
    setShowViewModal(true);
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      password_confirmation: '',
      role: user.role,
      is_active: isUserActive(user),
      phone: user.phone || '',
      // Staff-specific fields
      employee_id: (user as any).employee_id || '',
      position: (user as any).position || '',
      license_number: (user as any).license_number || '',
      license_expiry: (user as any).license_expiry || '',
      hire_date: (user as any).hire_date || '',
      hourly_rate: (user as any).hourly_rate || undefined,
      specializations: Array.isArray((user as any).specializations) ? (user as any).specializations : [],
      bio: (user as any).bio || '',
      years_experience: (user as any).years_experience || undefined
    });
    setFormErrors({});
    setShowPassword(false);
    setShowPasswordConfirm(false);
    setShowEditModal(true);
  };

  const handleDelete = async (user: User) => {
    try {
      const confirmed = await apiAdmin.confirmAction(
        `Delete User: ${user.name}?`,
        'This action is irreversible. All data related to this user will be permanently removed.',
        'Yes, Delete User',
        'warning'
      );

      if (confirmed) {
        await apiAdmin.deleteUser(user.id, user.name);
        await fetchUsers();
        await fetchStats();
      }
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    setSubmitting(true);

    try {
      if (formData.password !== formData.password_confirmation) {
        setFormErrors({ password_confirmation: 'Passwords do not match' });
        setSubmitting(false);
        return;
      }

      const userData: any = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        password_confirmation: formData.password_confirmation,
        role: formData.role,
        is_active: formData.is_active,
        status: formData.is_active ? 'active' : 'inactive',
        phone: formData.phone || undefined
      };

      // Add staff-specific fields if role is staff
      if (formData.role === 'staff') {
        if (formData.employee_id) userData.employee_id = formData.employee_id;
        if (formData.position) userData.position = formData.position;
        if (formData.license_number) userData.license_number = formData.license_number;
        if (formData.license_expiry) userData.license_expiry = formData.license_expiry;
        if (formData.hire_date) userData.hire_date = formData.hire_date;
        if (formData.hourly_rate !== undefined) userData.hourly_rate = formData.hourly_rate;
        if (formData.specializations && formData.specializations.length > 0) userData.specializations = formData.specializations;
        if (formData.bio) userData.bio = formData.bio;
        if (formData.years_experience !== undefined) userData.years_experience = formData.years_experience;
      }

      console.log('Creating user with data:', userData);
      await apiAdmin.createUser(userData);
      
      setShowCreateModal(false);
      setFormData({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        role: 'patient',
        is_active: true,
        phone: '',
        // Staff-specific fields
        employee_id: '',
        position: '',
        license_number: '',
        license_expiry: '',
        hire_date: '',
        hourly_rate: undefined,
        specializations: [],
        bio: '',
        years_experience: undefined
      });
      
      await fetchUsers();
      await fetchStats();
    } catch (error: any) {
      console.error('Create user error:', error);
      
      if (error.response?.status === 422) {
        const errors = error.response.data.errors || {};
        const errorMap: Record<string, string> = {};
        
        Object.keys(errors).forEach(key => {
          errorMap[key] = Array.isArray(errors[key]) ? errors[key][0] : errors[key];
        });
        
        setFormErrors(errorMap);
      } else {
        apiAdmin.showErrorToast(error.message || 'Failed to create user');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setFormErrors({});
    setSubmitting(true);

    try {
      if (formData.password && formData.password !== formData.password_confirmation) {
        setFormErrors({ password_confirmation: 'Passwords do not match' });
        setSubmitting(false);
        return;
      }

      const updateData: any = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        is_active: formData.is_active,
        status: formData.is_active ? 'active' : 'inactive',
        phone: formData.phone || undefined
      };

      if (formData.password && formData.password.trim() !== '') {
        updateData.password = formData.password;
        updateData.password_confirmation = formData.password_confirmation;
      }

      // Add staff-specific fields if role is staff
      if (formData.role === 'staff') {
        if (formData.employee_id) updateData.employee_id = formData.employee_id;
        if (formData.position) updateData.position = formData.position;
        if (formData.license_number) updateData.license_number = formData.license_number;
        if (formData.license_expiry) updateData.license_expiry = formData.license_expiry;
        if (formData.hire_date) updateData.hire_date = formData.hire_date;
        if (formData.hourly_rate !== undefined) updateData.hourly_rate = formData.hourly_rate;
        if (formData.specializations && formData.specializations.length > 0) updateData.specializations = formData.specializations;
        if (formData.bio) updateData.bio = formData.bio;
        if (formData.years_experience !== undefined) updateData.years_experience = formData.years_experience;
      }

      console.log('Updating user with data:', updateData);
      await apiAdmin.updateUser(selectedUser.id, updateData);
      
      setShowEditModal(false);
      setSelectedUser(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        role: 'patient',
        is_active: true,
        phone: '',
        // Staff-specific fields
        employee_id: '',
        position: '',
        license_number: '',
        license_expiry: '',
        hire_date: '',
        hourly_rate: undefined,
        specializations: [],
        bio: '',
        years_experience: undefined
      });
      
      await fetchUsers();
      await fetchStats();
    } catch (error: any) {
      console.error('Update user error:', error);
      
      if (error.response?.status === 422) {
        const errors = error.response.data.errors || {};
        const errorMap: Record<string, string> = {};
        
        Object.keys(errors).forEach(key => {
          errorMap[key] = Array.isArray(errors[key]) ? errors[key][0] : errors[key];
        });
        
        setFormErrors(errorMap);
      } else {
        apiAdmin.showErrorToast(error.message || 'Failed to update user');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    try {
      const currentStatus = isUserActive(user);
      const action = currentStatus ? 'Deactivate' : 'Activate';
      const confirmed = await apiAdmin.confirmAction(
        `${action} User: ${user.name}?`,
        `Are you sure you want to ${action.toLowerCase()} the account for ${user.name}?`,
        `Yes, ${action}`,
        'warning'
      );

      if (confirmed) {
        if (currentStatus) {
          await apiAdmin.deactivateUser(user.id);
        } else {
          await apiAdmin.activateUser(user.id);
        }
        await fetchUsers();
        await fetchStats();
      }
    } catch (error) {
      console.error('Error toggling user status:', error);
    }
  };

  const handleResetPassword = async (user: User) => {
    try {
      const confirmed = await apiAdmin.confirmAction(
        'Reset Password?',
        `Are you sure you want to reset the password for ${user.name}? This will send a password reset link to their email.`,
        'Yes, Reset Password',
        'info'
      );

      if (confirmed) {
        await apiAdmin.resetUserPassword(user.id);
      }
    } catch (error) {
      console.error('Error resetting password:', error);
    }
  };

  const handleExport = async () => {
    try {
      // Export new users added for the current month
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      
      // Export users created in the current month
      await apiAdmin.exportUsers(null, startDate, endDate);
    } catch (error) {
      console.error('Error exporting users:', error);
      apiAdmin.showErrorToast('Failed to export users');
    }
  };

  const toggleActionMenu = (e: React.MouseEvent, userId: number) => {
    e.stopPropagation();
    setShowActionMenu(showActionMenu === userId ? null : userId);
  };

  // ---------- Utility Functions ----------
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-gradient-to-r from-red-500 to-red-600 text-white';
      case 'staff':
        return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white';
      case 'patient':
        return 'bg-gradient-to-r from-green-500 to-green-600 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getStatusBadgeColor = (isActive: boolean) => {
    return isActive
      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800'
      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // ==================== RENDER ====================
  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="User Management" />

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-6 sm:py-8">
          {/* Modern Header */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                    User Management
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Manage system users, roles, and permissions
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleExport}
                  className="px-4 py-2.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:shadow-lg transition-all duration-200 flex items-center gap-2 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Export</span>
                </button>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="px-4 py-2.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:shadow-lg transition-all duration-200 flex items-center gap-2 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
                <button
                  onClick={handleCreate}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-200 flex items-center gap-2 font-medium"
                >
                  <UserPlus className="h-4 w-4" />
                  Add User
                </button>
              </div>
            </div>
          </div>

          {/* Enhanced Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
            <div className="group relative bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Users</p>
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                <div className="mt-2 flex items-center text-xs text-green-600 dark:text-green-400">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  <span>All users</span>
                </div>
              </div>
            </div>

            <div className="group relative bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Admins</p>
                  <Shield className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.admins}</p>
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  System administrators
                </div>
              </div>
            </div>

            <div className="group relative bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Staff</p>
                  <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.staff}</p>
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Medical staff
                </div>
              </div>
            </div>

            <div className="group relative bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Patients</p>
                  <UserCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.patients}</p>
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Registered patients
                </div>
              </div>
            </div>

            <div className="group relative bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active</p>
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.active}</p>
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Active accounts
                </div>
              </div>
            </div>

            <div className="group relative bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Inactive</p>
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.inactive}</p>
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Disabled accounts
                </div>
              </div>
            </div>
          </div>

          {/* Modern Filters Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6 overflow-hidden">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Filter className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="font-semibold text-gray-900 dark:text-white">Filters</span>
                {(filters.search || filters.role || filters.status) && (
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full font-medium">
                    Active
                  </span>
                )}
              </div>
              <div className={`transform transition-transform ${showFilters ? 'rotate-180' : ''}`}>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </button>

            {showFilters && (
              <div className="px-6 pb-6 border-t border-gray-100 dark:border-gray-700 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Search */}
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Search
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search users..."
                        value={filters.search}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                      />
                    </div>
                  </div>

                  {/* Role Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Role
                    </label>
                    <select
                      value={filters.role}
                      onChange={(e) => handleFilterChange('role', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                    >
                      <option value="">All Roles</option>
                      <option value="admin">Admin</option>
                      <option value="staff">Staff</option>
                      <option value="patient">Patient</option>
                    </select>
                  </div>

                  {/* Status Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Status
                    </label>
                    <select
                      value={filters.status}
                      onChange={(e) => handleFilterChange('status', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                    >
                      <option value="">All Status</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  {/* Per Page */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Per Page
                    </label>
                    <select
                      value={filters.per_page}
                      onChange={(e) => handleFilterChange('per_page', parseInt(e.target.value))}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                    >
                      <option value="10">10 per page</option>
                      <option value="15">15 per page</option>
                      <option value="25">25 per page</option>
                      <option value="50">50 per page</option>
                    </select>
                  </div>
                </div>

                {/* Clear Filters */}
                {(filters.search || filters.role || filters.status) && (
                  <button
                    onClick={() => setFilters({ ...filters, search: '', role: '', status: '', page: 1 })}
                    className="mt-4 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Clear Filters
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Modern Users Table */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            {loading ? (
              <div className="flex flex-col justify-center items-center py-20">
                <RefreshCw className="h-12 w-12 animate-spin text-blue-600 mb-4" />
                <p className="text-gray-500 dark:text-gray-400">Loading users...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="flex flex-col justify-center items-center py-20">
                <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
                  <Users className="h-12 w-12 text-gray-400" />
                </div>
                <p className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No users found</p>
                <p className="text-gray-500 dark:text-gray-400 mb-6">Try adjusting your filters or create a new user</p>
                <button
                  onClick={handleCreate}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  Create First User
                </button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider hidden md:table-cell">
                          Contact
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider hidden lg:table-cell">
                          Status
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider hidden xl:table-cell">
                          Joined
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {users.map((user) => (
                        <tr
                          key={user.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors group"
                        >
                          {/* User Info */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold shadow-lg">
                                  {getInitials(user.name)}
                                </div>
                                {user.email_verified_at && (
                                  <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center">
                                    <CheckCircle className="h-2.5 w-2.5 text-white" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                  {user.name}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate md:hidden">
                                  {user.email}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Contact */}
                          <td className="px-6 py-4 hidden md:table-cell">
                            <div className="space-y-1">
                              <div className="text-sm text-gray-900 dark:text-white flex items-center gap-2">
                                <Mail className="h-3.5 w-3.5 text-gray-400" />
                                <span className="truncate max-w-xs">{user.email}</span>
                              </div>
                              {user.phone && (
                                <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                  <Phone className="h-3.5 w-3.5 text-gray-400" />
                                  {user.phone}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Role */}
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${getRoleBadgeColor(user.role)} shadow-sm`}>
                              {user.role === 'admin' && <Shield className="h-3.5 w-3.5" />}
                              {user.role === 'staff' && <Activity className="h-3.5 w-3.5" />}
                              {user.role === 'patient' && <UserCheck className="h-3.5 w-3.5" />}
                              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                            </span>
                          </td>

                          {/* ✅ FIXED: Status - Using isUserActive helper */}
                          <td className="px-6 py-4 hidden lg:table-cell">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${getStatusBadgeColor(isUserActive(user))}`}>
                              {isUserActive(user) ? (
                                <>
                                  <CheckCircle className="h-3.5 w-3.5" />
                                  Active
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-3.5 w-3.5" />
                                  Inactive
                                </>
                              )}
                            </span>
                          </td>

                          {/* Joined Date */}
                          <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 hidden xl:table-cell">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              {formatDate(user.created_at)}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4">
                            <div className="flex justify-end items-center gap-1">
                              {/* Quick Actions */}
                              <button
                                onClick={() => handleView(user)}
                                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleEdit(user)}
                                className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                title="Edit User"
                              >
                                <Edit className="h-4 w-4" />
                              </button>

                              {/* More Actions Dropdown */}
                              <div className="relative">
                                <button
                                  onClick={(e) => toggleActionMenu(e, user.id)}
                                  className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                  title="More Actions"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </button>

                                {showActionMenu === user.id && (
                                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 z-50">
                                    
                                    {/* Toggle Status */}
                                    <button
                                      onClick={() => {
                                        handleToggleStatus(user);
                                        setShowActionMenu(null);
                                      }}
                                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center gap-3"
                                    >
                                      {isUserActive(user) ? (
                                        <>
                                          <ShieldOff className="h-4 w-4 text-orange-600" />
                                          <span className="text-orange-600 dark:text-orange-400">Deactivate Account</span>
                                        </>
                                      ) : (
                                        <>
                                          <Shield className="h-4 w-4 text-green-600" />
                                          <span className="text-green-600 dark:text-green-400">Activate Account</span>
                                        </>
                                      )}
                                    </button>

                                    {/* Reset Password */}
                                    <button
                                      onClick={() => {
                                        handleResetPassword(user);
                                        setShowActionMenu(null);
                                      }}
                                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors flex items-center gap-3"
                                    >
                                      <Key className="h-4 w-4 text-purple-600" />
                                      <span className="text-purple-600 dark:text-purple-400">Reset Password</span>
                                    </button>
                                
                                    <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>

                                    {/* Delete Action */}
                                    <button
                                      onClick={() => {
                                        handleDelete(user);
                                        setShowActionMenu(null);
                                      }}
                                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-3"
                                    >
                                      <Trash2 className="h-4 w-4 text-red-600" />
                                      <span className="text-red-600 dark:text-red-400">Delete User</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Modern Pagination */}
                {pagination.last_page > 1 && (
                  <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      Showing <span className="font-semibold">{pagination.from}</span> to{' '}
                      <span className="font-semibold">{pagination.to}</span> of{' '}
                      <span className="font-semibold">{pagination.total}</span> users
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePageChange(pagination.current_page - 1)}
                        disabled={pagination.current_page === 1}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </button>
                      
                      <div className="hidden sm:flex items-center gap-1">
                        {Array.from({ length: Math.min(5, pagination.last_page) }, (_, i) => {
                          let pageNum;
                          if (pagination.last_page <= 5) {
                            pageNum = i + 1;
                          } else if (pagination.current_page <= 3) {
                            pageNum = i + 1;
                          } else if (pagination.current_page >= pagination.last_page - 2) {
                            pageNum = pagination.last_page - 4 + i;
                          } else {
                            pageNum = pagination.current_page - 2 + i;
                          }
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                pagination.current_page === pageNum
                                  ? 'bg-blue-600 text-white shadow-lg'
                                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-750'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>

                      <span className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 sm:hidden">
                        Page {pagination.current_page} of {pagination.last_page}
                      </span>

                      <button
                        onClick={() => handlePageChange(pagination.current_page + 1)}
                        disabled={pagination.current_page === pagination.last_page}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* View User Modal */}
      {showViewModal && selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold text-lg">
                  {getInitials(selectedUser.name)}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">User Details</h2>
                  <p className="text-blue-100 text-sm">ID: {selectedUser.id}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedUser(null);
                }}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                  Basic Information
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-750 rounded-xl p-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Full Name</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedUser.name}</p>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-750 rounded-xl p-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Role</p>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold ${getRoleBadgeColor(selectedUser.role)}`}>
                      {selectedUser.role.charAt(0).toUpperCase() + selectedUser.role.slice(1)}
                    </span>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-750 rounded-xl p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Email Address</p>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedUser.email}</p>
                    {selectedUser.email_verified_at && (
                      <CheckCircle className="h-4 w-4 text-green-600" title="Verified" />
                    )}
                  </div>
                </div>

                {selectedUser.phone && (
                  <div className="bg-gray-50 dark:bg-gray-750 rounded-xl p-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Phone Number</p>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedUser.phone}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Account Status */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                  Account Status
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-750 rounded-xl p-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Status</p>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium ${getStatusBadgeColor(isUserActive(selectedUser))}`}>
                      {isUserActive(selectedUser) ? (
                        <>
                          <CheckCircle className="h-3.5 w-3.5" />
                          Active
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3.5 w-3.5" />
                          Inactive
                        </>
                      )}
                    </span>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-750 rounded-xl p-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Email Status</p>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium ${
                      selectedUser.email_verified_at 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800'
                    }`}>
                      {selectedUser.email_verified_at ? 'Verified' : 'Unverified'}
                    </span>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-750 rounded-xl p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Joined Date</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(selectedUser.created_at)}</p>
                  </div>
                </div>

                {selectedUser.last_login_at && (
                  <div className="bg-gray-50 dark:bg-gray-750 rounded-xl p-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Last Login</p>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(selectedUser.last_login_at)}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    handleEdit(selectedUser);
                  }}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium"
                >
                  <Edit className="h-4 w-4" />
                  Edit User
                </button>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedUser(null);
                  }}
                  className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors text-gray-700 dark:text-gray-300 font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="sticky top-0 bg-gradient-to-r from-green-600 to-green-700 px-6 py-5 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <UserPlus className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Create New User</h2>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>

            <form onSubmit={handleSubmitCreate} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full px-4 py-2.5 border ${formErrors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all`}
                    required
                  />
                  {formErrors.name && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {formErrors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`w-full px-4 py-2.5 border ${formErrors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all`}
                    required
                  />
                  {formErrors.email && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {formErrors.email}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                  />
                  {formErrors.phone && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {formErrors.phone}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Role *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                    required
                  >
                    <option value="patient">Patient</option>
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                  {formErrors.role && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {formErrors.role}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className={`w-full px-4 py-2.5 pr-10 border ${formErrors.password ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {formErrors.password && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {formErrors.password}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswordConfirm ? 'text' : 'password'}
                      value={formData.password_confirmation}
                      onChange={(e) => setFormData({ ...formData, password_confirmation: e.target.value })}
                      className="w-full px-4 py-2.5 pr-10 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      {showPasswordConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {formErrors.password_confirmation && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {formErrors.password_confirmation}
                    </p>
                  )}
                </div>
              </div>

              {/* Staff-specific fields */}
              {formData.role === 'staff' && (
                <div className="space-y-5 pt-5 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Staff Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Employee ID
                      </label>
                      <input
                        type="text"
                        value={formData.employee_id || ''}
                        onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                        placeholder="EMP-001"
                      />
                      {formErrors.employee_id && (
                        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {formErrors.employee_id}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Position *
                      </label>
                      <select
                        value={formData.position || ''}
                        onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                        required={formData.role === 'staff'}
                      >
                        <option value="">Select Position</option>
                        <option value="dentist">Dentist</option>
                        <option value="hygienist">Hygienist</option>
                        <option value="assistant">Assistant</option>
                        <option value="receptionist">Receptionist</option>
                      </select>
                      {formErrors.position && (
                        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {formErrors.position}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        License Number
                      </label>
                      <input
                        type="text"
                        value={formData.license_number || ''}
                        onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                        placeholder="LIC-12345"
                      />
                      {formErrors.license_number && (
                        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {formErrors.license_number}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        License Expiry
                      </label>
                      <input
                        type="date"
                        value={formData.license_expiry || ''}
                        onChange={(e) => setFormData({ ...formData, license_expiry: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                      />
                      {formErrors.license_expiry && (
                        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {formErrors.license_expiry}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Hire Date *
                      </label>
                      <input
                        type="date"
                        value={formData.hire_date || ''}
                        onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                        required={formData.role === 'staff'}
                      />
                      {formErrors.hire_date && (
                        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {formErrors.hire_date}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Hourly Rate
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.hourly_rate || ''}
                        onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value ? parseFloat(e.target.value) : undefined })}
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                        placeholder="0.00"
                      />
                      {formErrors.hourly_rate && (
                        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {formErrors.hourly_rate}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Years of Experience
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.years_experience || ''}
                      onChange={(e) => setFormData({ ...formData, years_experience: e.target.value ? parseInt(e.target.value) : undefined })}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                      placeholder="0"
                    />
                    {formErrors.years_experience && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {formErrors.years_experience}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Specializations
                    </label>
                    <input
                      type="text"
                      value={Array.isArray(formData.specializations) ? formData.specializations.join(', ') : ''}
                      onChange={(e) => {
                        const specializations = e.target.value.split(',').map(s => s.trim()).filter(s => s.length > 0);
                        setFormData({ ...formData, specializations });
                      }}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                      placeholder="General Dentistry, Orthodontics (comma-separated)"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Enter specializations separated by commas
                    </p>
                    {formErrors.specializations && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {formErrors.specializations}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Bio
                    </label>
                    <textarea
                      value={formData.bio || ''}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all resize-none"
                      placeholder="Brief biography or professional background..."
                    />
                    {formErrors.bio && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {formErrors.bio}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                  Activate user account immediately
                </label>
              </div>

              <div className="flex gap-3 pt-5 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-200 font-semibold flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      Create User
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors text-gray-700 dark:text-gray-300 font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="sticky top-0 bg-gradient-to-r from-amber-600 to-amber-700 px-6 py-5 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Edit className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Edit User</h2>
              </div>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedUser(null);
                }}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>

            <form onSubmit={handleSubmitEdit} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full px-4 py-2.5 border ${formErrors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all`}
                    required
                  />
                  {formErrors.name && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {formErrors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`w-full px-4 py-2.5 border ${formErrors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all`}
                    required
                  />
                  {formErrors.email && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {formErrors.email}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                  />
                  {formErrors.phone && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {formErrors.phone}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Role *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                    required
                  >
                    <option value="patient">Patient</option>
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                  {formErrors.role && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {formErrors.role}
                    </p>
                  )}
                </div>
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                <p className="text-sm text-amber-800 dark:text-amber-300 font-medium mb-2">Change Password (Optional)</p>
                <p className="text-xs text-amber-700 dark:text-amber-400">Leave blank to keep current password</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className={`w-full px-4 py-2.5 pr-10 border ${formErrors.password ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {formErrors.password && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {formErrors.password}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswordConfirm ? 'text' : 'password'}
                      value={formData.password_confirmation}
                      onChange={(e) => setFormData({ ...formData, password_confirmation: e.target.value })}
                      className="w-full px-4 py-2.5 pr-10 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      {showPasswordConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {formErrors.password_confirmation && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {formErrors.password_confirmation}
                    </p>
                  )}
                </div>
              </div>

              {/* Staff-specific fields */}
              {formData.role === 'staff' && (
                <div className="space-y-5 pt-5 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Staff Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Employee ID
                      </label>
                      <input
                        type="text"
                        value={formData.employee_id || ''}
                        onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                        placeholder="EMP-001"
                      />
                      {formErrors.employee_id && (
                        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {formErrors.employee_id}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Position *
                      </label>
                      <select
                        value={formData.position || ''}
                        onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                        required={formData.role === 'staff'}
                      >
                        <option value="">Select Position</option>
                        <option value="dentist">Dentist</option>
                        <option value="hygienist">Hygienist</option>
                        <option value="assistant">Assistant</option>
                        <option value="receptionist">Receptionist</option>
                      </select>
                      {formErrors.position && (
                        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {formErrors.position}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        License Number
                      </label>
                      <input
                        type="text"
                        value={formData.license_number || ''}
                        onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                        placeholder="LIC-12345"
                      />
                      {formErrors.license_number && (
                        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {formErrors.license_number}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        License Expiry
                      </label>
                      <input
                        type="date"
                        value={formData.license_expiry || ''}
                        onChange={(e) => setFormData({ ...formData, license_expiry: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                      />
                      {formErrors.license_expiry && (
                        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {formErrors.license_expiry}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Hire Date *
                      </label>
                      <input
                        type="date"
                        value={formData.hire_date || ''}
                        onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                        required={formData.role === 'staff'}
                      />
                      {formErrors.hire_date && (
                        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {formErrors.hire_date}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Hourly Rate
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.hourly_rate || ''}
                        onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value ? parseFloat(e.target.value) : undefined })}
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                        placeholder="0.00"
                      />
                      {formErrors.hourly_rate && (
                        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {formErrors.hourly_rate}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Years of Experience
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.years_experience || ''}
                      onChange={(e) => setFormData({ ...formData, years_experience: e.target.value ? parseInt(e.target.value) : undefined })}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                      placeholder="0"
                    />
                    {formErrors.years_experience && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {formErrors.years_experience}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Specializations
                    </label>
                    <input
                      type="text"
                      value={Array.isArray(formData.specializations) ? formData.specializations.join(', ') : ''}
                      onChange={(e) => {
                        const specializations = e.target.value.split(',').map(s => s.trim()).filter(s => s.length > 0);
                        setFormData({ ...formData, specializations });
                      }}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                      placeholder="General Dentistry, Orthodontics (comma-separated)"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Enter specializations separated by commas
                    </p>
                    {formErrors.specializations && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {formErrors.specializations}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Bio
                    </label>
                    <textarea
                      value={formData.bio || ''}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all resize-none"
                      placeholder="Brief biography or professional background..."
                    />
                    {formErrors.bio && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {formErrors.bio}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                <input
                  type="checkbox"
                  id="edit_is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                />
                <label htmlFor="edit_is_active" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                  User account is active
                </label>
              </div>

              <div className="flex gap-3 pt-5 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-200 font-semibold flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                   {submitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Update User
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedUser(null);
                  }}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors text-gray-700 dark:text-gray-300 font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}