@component('mail::message')

# Appointment Updated

Hello {{ $patient->name }},

Your appointment details have been updated. Please review the updated information below.

@php
	$systemTimezone = date_default_timezone_get();
	$timeFormatted = 'N/A';
	if ($appointment->appointment_time) {
		try {
			$timeFormatted = \Carbon\Carbon::createFromFormat('H:i:s', $appointment->appointment_time)
				->timezone($systemTimezone)
				->format('g:i A');
		} catch (\Exception $e) {
			$timeFormatted = $appointment->appointment_time;
		}
	}
@endphp

**Updated Appointment Details**

- **Service:** {{ $service->name ?? 'N/A' }}
- **Doctor:** Dr. {{ $doctor->name ?? 'N/A' }}
- **Date:** {{ $appointment->appointment_date ? $appointment->appointment_date->format('l, F d, Y') : 'N/A' }}
- **Time:** {{ $timeFormatted }}
- **Status:** {{ $displayStatus ?? ucfirst(str_replace('_', ' ', $appointment->status ?? 'N/A')) }}
- **Notes:** {{ $appointment->notes ? $appointment->notes : 'None' }}

**Changes**
@foreach ($changes as $change)
- **{{ $change['label'] }}:** {{ $change['from'] }} -> {{ $change['to'] }}
@endforeach

If you have any questions or need to reschedule, please contact the clinic.

Thanks,
**{{ config('mail.from.name') }}**

@endcomponent
