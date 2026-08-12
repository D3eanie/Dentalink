<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class NewPasswordController extends Controller
{
    /**
     * Show the password reset page.
     */
    public function create(Request $request): Response
    {
        $token = $request->route('token');
        $email = $request->email;

        \Illuminate\Support\Facades\Log::info('Password reset page loaded', [
            'token_from_route' => substr($token, 0, 20) . '...',
            'token_length' => strlen($token),
            'email_from_query' => $email,
        ]);

        // Check if token exists in database
        $tokenRecord = DB::table('password_reset_tokens')
            ->where('email', $email)
            ->first();

        if ($tokenRecord) {
            \Illuminate\Support\Facades\Log::info('Token found in database', [
                'db_token' => substr($tokenRecord->token, 0, 20) . '...',
                'db_token_length' => strlen($tokenRecord->token),
                'match' => hash_equals($tokenRecord->token, $token) ? 'YES' : 'NO',
            ]);
        } else {
            \Illuminate\Support\Facades\Log::warning('Token NOT found in database', [
                'email' => $email,
                'all_tokens_for_email' => DB::table('password_reset_tokens')->where('email', $email)->pluck('token'),
            ]);
        }

        return Inertia::render('auth/reset-password', [
            'email' => $email,
            'token' => $token,
        ]);
    }

    /**
     * Handle an incoming new password request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'token' => 'required',
            'email' => 'required|email',
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        // Get the stored token from database
        $tokenRecord = DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->first();

        // Debug logging
        \Illuminate\Support\Facades\Log::info('Password reset attempt', [
            'email' => $request->email,
            'received_token' => substr($request->token, 0, 20) . '...',
            'received_token_length' => strlen($request->token),
            'token_exists_in_db' => $tokenRecord ? true : false,
            'db_token_length' => $tokenRecord ? strlen($tokenRecord->token) : null,
            'tokens_match' => $tokenRecord && hash_equals($tokenRecord->token, $request->token) ? 'YES' : 'NO',
        ]);

        // Validate token exists and matches
        if (!$tokenRecord) {
            throw ValidationException::withMessages([
                'email' => [__('This password reset token is invalid. (Token not found in database)')],
            ]);
        }

        if (!hash_equals($tokenRecord->token, $request->token)) {
            throw ValidationException::withMessages([
                'email' => [__('This password reset token is invalid. (Token mismatch)')],
            ]);
        }

        // Check if token is expired (60 minutes)
        $tokenAge = now()->diffInMinutes($tokenRecord->created_at);
        if ($tokenAge > 60) {
            DB::table('password_reset_tokens')->where('email', $request->email)->delete();
            throw ValidationException::withMessages([
                'email' => [__('This password reset token has expired.')],
            ]);
        }

        // Find user and update password
        $user = User::where('email', $request->email)->first();
        if (!$user) {
            throw ValidationException::withMessages([
                'email' => [__('We can\'t find a user with that email address.')],
            ]);
        }

        // Update password
        $user->forceFill([
            'password' => Hash::make($request->password),
            'remember_token' => Str::random(60),
        ])->save();

        // Delete the token
        DB::table('password_reset_tokens')->where('email', $request->email)->delete();

        // Fire event
        event(new PasswordReset($user));

        return to_route('login')->with('status', __('auth.password'));
    }
}
