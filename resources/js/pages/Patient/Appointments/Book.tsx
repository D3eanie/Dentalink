import React, { useState, useEffect } from 'react';
import apiPatient from  '@/services/ApiPatient';
import AppLayout from '@/layouts/app-layout';
import { usePage } from '@inertiajs/react';
import { formatAppointmentTime } from '@/utils/dateTime';
import {
  Calendar,
  Clock,
  User,
  Stethoscope,
  PhilippinePeso,
  FileText,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Search
} from 'lucide-react';

interface Service {
  id: number;
  name: string;
  description: string;
  price: number;
  duration_minutes: number;
  category: string;
}

interface Doctor {
  id: number;
  name: string;
  specialization?: string;
  available?: boolean;
}

interface TimeSlot {
  time: string;
  display?: string;
  available: boolean;
}

interface FormData {
  service_id: string;
  doctor_id: string;
  appointment_date: string;
  appointment_time: string;
  notes: string;
}

export default function PatientBookAppointment() {
  const { auth } = usePage().props as any;
  const currentUser = auth?.user;

  const [step, setStep] = useState(1);
  const [services, setServices] = useState<Service[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    service_id: '',
    doctor_id: '',
    appointment_date: '',
    appointment_time: '',
    notes: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, any>>({});
  const [isRaceMode, setIsRaceMode] = useState(false);
  const [raceCountdown, setRaceCountdown] = useState(0);
  const [searchService, setSearchService] = useState('');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

  useEffect(() => {
    fetchServices();
  }, []);

  useEffect(() => {
    if (formData.service_id) {
      fetchDoctors();
    }
  }, [formData.service_id]);

  const fetchServices = async () => {
    try {
      const response = await apiPatient.getServices({ is_active: 1 });
      const servicesList = response?.data?.data || response?.data || response?.services || [];
      setServices(servicesList);
    } catch (error) {
      console.error('Error fetching services:', error);
      apiPatient.showErrorToast('Failed to load services');
    }
  };

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      // Optionally pass service_id for future filtering if needed
      const response = await apiPatient.getDoctorsForBooking(
        formData.service_id ? { service_id: formData.service_id } : {}
      );

      const doctorsData =
        response?.data ||
        response?.doctors ||
        response ||
        [];

      // Map backend users to Doctor shape
      const mappedDoctors: Doctor[] = (doctorsData as any[]).map((u) => ({
        id: u.id,
        name: u.name,
        specialization: u.position || 'Doctor',
        available: true, // All active doctors are available for booking
      }));

      setDoctors(mappedDoctors);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      apiPatient.showErrorToast('Failed to load doctors');
      setDoctors([]); // Ensure doctors array is empty on error
    } finally {
      setLoading(false);
    }
  };



const fetchAvailableSlots = async (
  doctorIdParam?: string,
  dateParam?: string,
  options: { enforceSchedule?: boolean } = {}
) => {
  try {
    setLoading(true);
    setAvailableSlots([]); // Clear previous slots

    const doctorId = doctorIdParam ?? formData.doctor_id;
    const date = dateParam ?? formData.appointment_date;

    if (!doctorId || !date) {
      return;
    }

    // Fetch available slots from doctor's schedule
    const response = await apiPatient.getAvailableSlots({
      doctor_id: doctorId,
      date,
      duration: selectedService?.duration_minutes || 30
    });

    // Handle different response structures
    let slots: TimeSlot[] = [];

    if (Array.isArray(response)) {
      slots = response;
    } else if (response?.data) {
      slots = Array.isArray(response.data) ? response.data : response.data.slots || [];
    } else if (response?.slots) {
      slots = response.slots;
    }

    // If we are strictly enforcing schedule and backend reports no schedule,
    // clear the date selection and prevent using this date.
    const noScheduleMessage =
      typeof response?.message === 'string' &&
      response.message.toLowerCase().includes('no schedule available');

    if (options.enforceSchedule && noScheduleMessage) {
      apiPatient.showErrorToast(
        'This doctor has no available schedule on the selected date. Please choose another date.'
      );
      setFormData(prev => ({
        ...prev,
        appointment_date: '',
        appointment_time: ''
      }));
      setAvailableSlots([]);
      return;
    }

    // Ensure slots have proper format
    const formattedSlots = slots.map((slot: any) => ({
      time: slot.time || slot,
      display: slot.display || formatTimeSlot({ time: slot.time || slot, available: true }),
      available: slot.available !== false // Default to true if not specified
    }));

    console.log('✅ Available slots from schedule:', formattedSlots);

    if (formattedSlots.length === 0 && !noScheduleMessage) {
      // Schedule exists but may be fully booked
      apiPatient.showErrorToast(
        'No available time slots for this doctor on the selected date. Please select a different time or date.'
      );
    }

    setAvailableSlots(formattedSlots);
  } catch (error: any) {
    console.error('❌ Error fetching slots:', error);
    apiPatient.showErrorToast(error?.message || 'Failed to load available time slots. The doctor may not have a schedule set for this date.');

    // Set empty slots on error - don't show fallback slots
    setAvailableSlots([]);
  } finally {
    setLoading(false);
  }
};






  // const fetchAvailableSlots = async () => {
  //   try {
  //     setLoading(true);
  //     setAvailableSlots([]); // Clear previous slots

  //     console.log('📅 Fetching slots for:', {
  //       doctor_id: formData.doctor_id,
  //       date: formData.appointment_date,
  //       duration: selectedService?.duration_minutes
  //     });

  //     const response = await apiPatient.getAvailableSlots({
  //       doctor_id: formData.doctor_id,
  //       date: formData.appointment_date,
  //       duration: selectedService?.duration_minutes || 30
  //     });

  //     console.log('📋 Slots response:', response);

  //     // Handle different response structures
  //     let slots: TimeSlot[] = [];

  //     if (Array.isArray(response)) {
  //       slots = response;
  //     } else if (response?.data) {
  //       slots = Array.isArray(response.data) ? response.data : response.data.slots || [];
  //     } else if (response?.slots) {
  //       slots = response.slots;
  //     }

  //     console.log('✅ Processed slots:', slots);

  //     if (slots.length === 0) {
  //       apiPatient.showErrorToast('No available time slots for this date');
  //     }

  //     setAvailableSlots(slots);
  //   } catch (error: any) {
  //     console.error('❌ Error fetching slots:', error);
  //     apiPatient.showErrorToast(error?.message || 'Failed to load available time slots');

  //     // Mock data for demonstration - REMOVE IN PRODUCTION
  //     setAvailableSlots([
  //       { time: '09:00:00', display: '9:00 AM', available: true },
  //       { time: '09:30:00', display: '9:30 AM', available: true },
  //       { time: '10:00:00', display: '10:00 AM', available: false },
  //       { time: '10:30:00', display: '10:30 AM', available: true },
  //       { time: '11:00:00', display: '11:00 AM', available: true },
  //       { time: '14:00:00', display: '2:00 PM', available: true },
  //       { time: '14:30:00', display: '2:30 PM', available: false },
  //       { time: '15:00:00', display: '3:00 PM', available: true },
  //       { time: '15:30:00', display: '3:30 PM', available: true },
  //       { time: '16:00:00', display: '4:00 PM', available: true }
  //     ]);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    setFormData({ ...formData, service_id: service.id.toString() });
    setFormErrors({});
    setStep(2);
  };

  const handleDoctorSelect = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    // Reset date and time when changing doctor so we can re-validate against their schedule
    setFormData({
      ...formData,
      doctor_id: doctor.id.toString(),
      appointment_date: '',
      appointment_time: ''
    });
    setFormErrors({});
    setStep(3);
  };

  const handleDateChange = async (value: string) => {
    // Optimistically set the date, but immediately validate against doctor's schedule
    setFormErrors(prev => ({ ...prev, appointment_date: undefined }));
    setFormData(prev => ({
      ...prev,
      appointment_date: value,
      appointment_time: ''
    }));

    // Enforce that the selected date must have a schedule for this doctor
    await fetchAvailableSlots(formData.doctor_id, value, { enforceSchedule: true });
  };

  const handleTimeSlotSelect = (time: string) => {
    setFormData({ ...formData, appointment_time: time });
    setFormErrors({});
    setStep(4);
  };

  /**
   * Convert time from H:i:s format to H:i format
   * Backend validation expects "H:i" format (e.g., "09:00" not "09:00:00")
   */
  const formatTimeForBackend = (time: string): string => {
    if (!time) return '';

    // If time already in H:i format (no seconds), return as is
    if (time.split(':').length === 2) {
      return time;
    }

    // Remove seconds: "09:00:00" -> "09:00"
    const parts = time.split(':');
    return `${parts[0]}:${parts[1]}`;
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setFormErrors({});

      // Check if user is logged in
      if (!currentUser?.id) {
        setFormErrors({ general: 'You must be logged in to book an appointment.' });
        return;
      }

      // Validate required fields
      const errors: Record<string, string> = {};
      if (!formData.service_id) errors.service_id = 'Service is required';
      if (!formData.doctor_id) errors.doctor_id = 'Doctor is required';
      if (!formData.appointment_date) errors.appointment_date = 'Date is required';
      if (!formData.appointment_time) errors.appointment_time = 'Time is required';

      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        return;
      }

      // Convert IDs to numbers and format time correctly for backend
      const submitData = {
        patient_id: parseInt(String(currentUser.id), 10),
        service_id: parseInt(formData.service_id, 10),
        doctor_id: parseInt(formData.doctor_id, 10),
        appointment_date: formData.appointment_date,
        appointment_time: formatTimeForBackend(formData.appointment_time), // ✅ Format to H:i (09:00)
        notes: formData.notes?.trim() || undefined,
        duration_minutes: selectedService?.duration_minutes || 30
      };

      console.log('📤 Submitting appointment data:', submitData);
      console.log('📅 Time format:', {
        original: formData.appointment_time,
        formatted: submitData.appointment_time
      });

      const response = await apiPatient.bookAppointment(submitData);

      // Handle race case response
      if (response?.data?.race_case) {
        // Appointment is in race mode - show pending confirmation
        setIsRaceMode(true);
        setRaceCountdown(response?.data?.confirmation_window || 120);

        // Start countdown timer
        const interval = setInterval(() => {
          setRaceCountdown(prev => {
            if (prev <= 1) {
              clearInterval(interval);
              // After countdown, redirect to appointments page
              setTimeout(() => {
                window.location.href = '/patient/appointments';
              }, 1000);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        // Also redirect after the confirmation window
        setTimeout(() => {
          clearInterval(interval);
          window.location.href = '/patient/appointments';
        }, (response?.data?.confirmation_window || 120) * 1000 + 2000);
      } else {
        // Regular booking - redirect immediately
        window.location.href = '/patient/appointments';
      }
    } catch (error: any) {
      console.error('❌ Error booking appointment:', error);

      // Extract validation errors from the error object
      if (error?.response?.data?.errors) {
        const backendErrors = error.response.data.errors;
        console.log('Backend validation errors:', backendErrors);
        setFormErrors(backendErrors);
      } else if (error?.response?.data?.message) {
        setFormErrors({ general: error.response.data.message });
      } else {
        setFormErrors({ general: error.message || 'Failed to book appointment. Please try again.' });
      }

      // Log detailed error for debugging
      console.log('Error details:', {
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  const formatTimeSlot = (slot: TimeSlot) => {
    if (slot.display) return slot.display;
    return formatAppointmentTime(slot.time);
  };

  const getErr = (val?: any) => {
    if (!val) return undefined;
    if (Array.isArray(val)) return val[0];
    if (typeof val === 'string') return val;
    return String(val);
  };

  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(searchService.toLowerCase()) ||
    service.description?.toLowerCase().includes(searchService.toLowerCase()) ||
    service.category?.toLowerCase().includes(searchService.toLowerCase())
  );

  const minDate = new Date().toISOString().split('T')[0];

  // Filter available slots: remove unavailable, past times (if today), and lunch break (12:00-12:59)
  const getFilteredSlots = () => {
    if (!availableSlots.length) return [];

    const now = new Date();
    const isToday = formData.appointment_date === minDate;
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;

    return availableSlots.filter((slot) => {
      // Remove unavailable slots
      if (!slot.available) return false;

      // Remove lunch break (12:00-12:59)
      const slotTime = slot.time.split(':');
      const slotHour = parseInt(slotTime[0], 10);
      const slotMinute = parseInt(slotTime[1] || '0', 10);

      if (slotHour === 12) {
        return false; // Remove all 12:XX times
      }

      // If today, remove slots earlier than current time
      if (isToday) {
        const slotTimeInMinutes = slotHour * 60 + slotMinute;
        if (slotTimeInMinutes < currentTimeInMinutes) {
          return false;
        }
      }

      return true;
    });
  };

  const filteredSlots = getFilteredSlots();

  return (
    <AppLayout>
    <div className="min-h-screen bg-gray-50">
      {/* Race Mode Pending Confirmation Screen */}
      {isRaceMode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-8 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-blue-600 animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking in Progress</h2>
              <p className="text-gray-600">Your appointment request is being processed in a race case scenario.</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-700 mb-3">Confirmation will be completed in:</p>
              <p className="text-4xl font-bold text-blue-600">
                {Math.floor(raceCountdown / 60)}:{String(raceCountdown % 60).padStart(2, '0')}
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <AlertCircle className="w-5 h-5 text-amber-600 mx-auto mb-2" />
              <p className="text-sm text-amber-700">
                <strong>First-come-first-served:</strong> Your appointment is secure if no one books this slot within the next 2 minutes. You will receive an email confirmation or notification if the slot is taken.
              </p>
            </div>

            <p className="text-sm text-gray-500">
              You will be redirected to your appointments page shortly...
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-900">Book an Appointment</h1>
          <p className="text-gray-600 mt-1">Schedule your visit in a few simple steps</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4].map((stepNum) => (
              <React.Fragment key={stepNum}>
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    step >= stepNum ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {stepNum}
                  </div>
                  <p className={`text-sm mt-2 ${step >= stepNum ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                    {stepNum === 1 && 'Service'}
                    {stepNum === 2 && 'Doctor'}
                    {stepNum === 3 && 'Date & Time'}
                    {stepNum === 4 && 'Confirm'}
                  </p>
                </div>
                {stepNum < 4 && (
                  <div className={`flex-1 h-1 mx-4 ${step > stepNum ? 'bg-blue-600' : 'bg-gray-200'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* General Error Message */}
        {formErrors.general && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-red-800 font-medium">Error</p>
                <p className="text-red-700 text-sm mt-1">{getErr(formErrors.general)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Display all validation errors except appointment_date (handled inline) */}
        {Object.keys(formErrors).some((key) => key !== 'appointment_date') && !formErrors.general && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-red-800 font-medium mb-2">Please fix the following errors:</p>
                <ul className="list-disc list-inside space-y-1">
                  {Object.entries(formErrors)
                    .filter(([key]) => key !== 'appointment_date')
                    .map(([key, value]) => (
                      <li key={key} className="text-red-700 text-sm">
                        <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span> {getErr(value)}
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Select Service */}
        {step === 1 && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Select a Service</h2>

            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search services..."
                  value={searchService}
                  onChange={(e) => setSearchService(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {filteredServices.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">
                  {searchService ? 'No services match your search' : 'No services available'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredServices.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => handleServiceSelect(service)}
                    className="text-left p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{service.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                        <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {service.duration_minutes} min
                          </span>
                          <span className="flex items-center gap-1">
                            {formatCurrency(service.price)}
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Select Doctor */}
        {step === 2 && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Select a Doctor</h2>
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            </div>

            {selectedService && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-900">
                  <span className="font-medium">Selected Service:</span> {selectedService.name}
                </p>
              </div>
            )}

            {doctors.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No doctors available at this time</p>
                <p className="text-sm text-gray-400 mt-2">Please contact the clinic for assistance</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {doctors.map((doctor) => (
                  <button
                    key={doctor.id}
                    onClick={() => handleDoctorSelect(doctor)}
                    disabled={!doctor.available}
                    className={`text-left p-4 border-2 rounded-lg transition-colors ${
                      doctor.available
                        ? 'border-gray-200 hover:border-blue-500 hover:bg-blue-50'
                        : 'border-gray-100 bg-gray-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex gap-3 flex-1">
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <User className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">Dr. {doctor.name}</h3>
                          <p className="text-sm text-gray-600 mt-1">{doctor.specialization}</p>
                          {!doctor.available && (
                            <span className="inline-block mt-2 text-xs px-2 py-1 bg-gray-200 text-gray-600 rounded">
                              Not Available
                            </span>
                          )}
                        </div>
                      </div>
                      {doctor.available && <ArrowRight className="w-5 h-5 text-gray-400" />}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Select Date & Time */}
        {step === 3 && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Select Date & Time</h2>
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            </div>

            {selectedDoctor && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-900">
                  <span className="font-medium">Booking with:</span> Dr. {selectedDoctor.name}
                </p>
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Date
              </label>
              <input
                type="date"
                value={formData.appointment_date}
                onChange={(e) => handleDateChange(e.target.value)}
                min={minDate}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              {formErrors.appointment_date && (
                <p className="text-red-500 text-sm mt-1">{getErr(formErrors.appointment_date)}</p>
              )}
            </div>

            {formData.appointment_date && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Available Time Slots
                </label>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="text-gray-500 mt-2">Loading available slots...</p>
                  </div>
                ) : filteredSlots.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">No available time slots for this date</p>
                    <p className="text-sm text-gray-400 mt-1">Please select a different date</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {filteredSlots.map((slot, index) => (
                      <button
                        key={`${slot.time}-${index}`}
                        onClick={() => handleTimeSlotSelect(slot.time)}
                        className={`p-3 rounded-lg border-2 text-center font-medium transition-colors ${
                          formData.appointment_time === slot.time
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50 text-gray-900'
                        }`}
                      >
                        {formatTimeSlot(slot)}
                      </button>
                    ))}
                  </div>
                )}
                {formErrors.appointment_time && (
                  <p className="text-red-500 text-sm mt-2">{getErr(formErrors.appointment_time)}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 4 && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Confirm Appointment Request Details</h2>
              <button
                onClick={() => setStep(3)}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            </div>

            {/* Summary */}
            <div className="space-y-4 mb-6">
              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <Stethoscope className="w-5 h-5 text-blue-600" />
                  <h3 className="font-medium text-gray-900">Service</h3>
                </div>
                <p className="text-gray-600 ml-8">{selectedService?.name}</p>
                <p className="text-sm text-gray-500 ml-8">{formatCurrency(selectedService?.price || 0)}</p>
              </div>

              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <User className="w-5 h-5 text-blue-600" />
                  <h3 className="font-medium text-gray-900">Doctor</h3>
                </div>
                <p className="text-gray-600 ml-8">Dr. {selectedDoctor?.name}</p>
                <p className="text-sm text-gray-500 ml-8">{selectedDoctor?.specialization}</p>
              </div>

              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <h3 className="font-medium text-gray-900">Date & Time</h3>
                </div>
                <p className="text-gray-600 ml-8">
                  {(() => {
                    const [year, month, day] = formData.appointment_date.split('-').map(Number);
                    return new Date(year, month - 1, day).toLocaleDateString('en-PH', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    });
                  })()}
                </p>
                <p className="text-gray-600 ml-8">
                  {formatTimeSlot(availableSlots.find(s => s.time === formData.appointment_time) || { time: formData.appointment_time, available: true })}
                </p>
              </div>
            </div>

            {/* Additional Info */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  placeholder="Any additional information..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? (
                <>
                  <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Confirm Details
                </>
              )}
            </button>

            <p className="text-center text-sm text-gray-500 mt-4">
              You will receive a confirmation email once your appointment is confirmed
            </p>
          </div>
        )}
      </div>
    </div>
    </AppLayout>
  );
}
