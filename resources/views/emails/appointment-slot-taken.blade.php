@component('mail::message')

# ⏰ Appointment Slot No Longer Available

Hello,

We apologize, but the appointment slot you requested has just been taken by another patient.

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
@endphp

**Appointment Details**

- **Service:** {{ $service->name }}
- **Doctor:** Dr. {{ $doctor->name }}
- **Date:** {{ $appointment->appointment_date->format('l, F d, Y') }}
- **Time:** {{ $timeFormatted }}
- **Slot Taken At:** {{ $takenAt }}

This happened because the appointment slot was under a first-come-first-served basis, and another patient booked the same slot slightly earlier than your request.

**What You Can Do**

1. **Choose another time slot:** Visit your booking page to select a different appointment time with the same or different doctor
2. **Get on the waitlist:** Contact our clinic to be added to a cancellation waitlist for this time slot
3. **Contact support:** If you have any questions, reply to this email

We appreciate your understanding and apologize for any inconvenience!

Thanks,
**{{ config('mail.from.name') }}**

@endcomponent
