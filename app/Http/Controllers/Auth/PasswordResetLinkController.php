<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Notifications\ResetPassword;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class PasswordResetLinkController extends Controller
{
    /**
     * Show the password reset link request page.
     */
    public function create(Request $request): Response
    {
        return Inertia::render('auth/forgot-password', [
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Handle an incoming password reset link request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        // Find user by email
        $user = User::where('email', $request->email)->first();

        \Illuminate\Support\Facades\Log::info('Forgot password request received', [
            'email' => $request->email,
            'user_exists' => $user ? 'YES' : 'NO',
        ]);

        // If user doesn't exist, still show success message (security best practice)
        if ($user) {
            // Generate plain text token
            $token = Str::random(64);

            \Illuminate\Support\Facades\Log::info('Generated password reset token', [
                'email' => $request->email,
                'token' => substr($token, 0, 20) . '...',
                'token_length' => strlen($token),
            ]);

            // Store token in database
            DB::table('password_reset_tokens')->updateOrInsert(
                ['email' => $request->email],
                [
                    'token' => $token,
                    'created_at' => now(),
                ]
            );

            // Verify token was stored
            $stored = DB::table('password_reset_tokens')->where('email', $request->email)->first();
            \Illuminate\Support\Facades\Log::info('Token stored in database', [
                'email' => $request->email,
                'stored_token' => substr($stored->token, 0, 20) . '...',
                'stored_token_length' => strlen($stored->token),
                'matches' => hash_equals($stored->token, $token) ? 'YES' : 'NO',
            ]);

            // Send password reset email with our custom notification
            $user->notify(new ResetPassword($token));

            \Illuminate\Support\Facades\Log::info('Password reset email sent', [
                'email' => $request->email,
            ]);
        }

        // Always return success message (security best practice - don't reveal if email exists)
        return back()->with('status', __('A reset link will be sent if the account exists.'));
    }
}
