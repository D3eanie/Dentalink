<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class EmailVerificationController extends Controller
{
    /**
     * Show the email verification settings page.
     */
    public function edit(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('settings/email-verification', [
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'email_verified_at' => $user->email_verified_at,
            ],
            'mustVerifyEmail' => $user instanceof MustVerifyEmail,
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Send a verification email to the user.
     */
    public function sendVerificationEmail(Request $request): RedirectResponse
    {
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return to_route('email-verification.edit')->with('status', 'Email already verified');
        }

        $user->sendEmailVerificationNotification();

        return to_route('email-verification.edit')->with('status', 'verification-link-sent');
    }
}
