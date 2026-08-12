@component('mail::message')
# Reset Your Password

Hello {{ $user->name }},

You are receiving this email because we received a password reset request for your account.

@component('mail::button', ['url' => $url, 'color' => 'primary'])
Reset Password
@endcomponent

This password reset link will expire in {{ config('auth.passwords.'.config('auth.defaults.passwords').'.expire') }} minutes.

If you did not request a password reset, no further action is required. Your password will remain unchanged.

**Security Tips:**
- Never share your password with anyone
- Use a strong, unique password for your account
- If you suspect unauthorized access, contact our support team immediately

Thanks,<br>
**{{ config('app.name') }} Team**

---

If you're having trouble clicking the "Reset Password" button, copy and paste the URL below into your web browser:

<span style="word-break: break-all;">{{ $url }}</span>

@endcomponent
