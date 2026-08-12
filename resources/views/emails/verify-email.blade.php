@component('mail::message')
# Verify Your Email Address

Hello {{ $user->name }},

Thank you for registering with {{ config('app.name') }}. Please verify your email address by clicking the button below:

@component('mail::button', ['url' => $url, 'color' => 'primary'])
Verify Email Address
@endcomponent

This verification link will expire in {{ config('auth.verification.expire', 60) }} minutes.

If you did not create an account, no further action is required.

**Security Tip:** For your security, we recommend that you do not share this link with anyone.

Thanks,<br>
**{{ config('app.name') }} Team**

---

If you're having trouble clicking the "Verify Email Address" button, copy and paste the URL below into your web browser:

<span style="word-break: break-all;">{{ $url }}</span>

@endcomponent
