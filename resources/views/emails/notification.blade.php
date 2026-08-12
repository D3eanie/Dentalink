@component('mail::message')

# {{ $notification->title }}

Hello {{ $user->name ?? 'Valued Patient' }},

@php
	$message = $notification->message;
	if (($notification->type ?? null) === 'transaction') {
		$message = str_replace('$', '₱', $message);
	}
@endphp

{{ $message }}

@if(isset($notification->type) && $notification->type === 'appointment')
**Appointment Details**

- Please check your appointments page for details and any required actions.
@endif

If you have any questions or need assistance, reply to this email or contact our clinic support.

Thanks,
**{{ config('mail.from.name') }}**

@endcomponent
