@component('mail::message')

# ✓ Your Appointment Has Been Confirmed

Hello {{ $patient->name }},

Your appointment booking has been confirmed! You won the race for this time slot. 🎉

@php
	$systemTimezone = date_default_timezone_get();
	$timeFormatted = $appointment->appointment_time;
	try {
		$timeFormatted = \Carbon\Carbon::createFromFormat('H:i:s', $appointment->appointment_time)
			->timezone($systemTimezone)
			->format('g:i A');
	} catch (\Exception $e) {
		$timeFormatted = $appointment->appointment_time;
	}
	$createdAtFormatted = $appointment->created_at
		? $appointment->created_at->timezone($systemTimezone)->format('M d, Y \a\t h:i:s A')
		: 'N/A';
@endphp

**Appointment Details**

- **Service:** {{ $service->name }}
- **Doctor:** Dr. {{ $doctor->name }}
- **Date:** {{ $appointment->appointment_date->format('l, F d, Y') }}
- **Time:** {{ $timeFormatted }}
- **Duration:** {{ $appointment->duration_minutes }} minutes

**Confirmation Details**

Your appointment booking was received on {{ $createdAtFormatted }}.

**What's Next?**

- Mark your calendar for the scheduled appointment
- Please arrive 5-10 minutes early
- If you need to reschedule or cancel, visit your appointments page

If you have any questions or need assistance, reply to this email or contact our clinic support.

Thanks,
**{{ config('mail.from.name') }}**

@endcomponent
