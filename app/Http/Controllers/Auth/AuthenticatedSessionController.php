<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class AuthenticatedSessionController extends Controller
{
    /**
     * Show the login page.
     */
    public function create(Request $request)
    {
        // If user is already authenticated, redirect to their dashboard
        // The guest middleware should handle this, but we'll check here too
        if (Auth::check()) {
            $user = Auth::user();
            $redirectRoute = match($user->role) {
                'admin' => 'admin.dashboard',
                'patient' => 'patient.dashboard',
                'staff' => 'staff.dashboard',
                default => 'dashboard',
            };
            
            return redirect()->route($redirectRoute);
        }

        return Inertia::render('auth/login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request)
    {
        $request->authenticate();

        // Get authenticated user before session regeneration
        $user = Auth::user();

        // Invalidate all other sessions for this user to prevent duplicate logins
        // This ensures only one active session per user
        DB::table('sessions')
            ->where('user_id', $user->id)
            ->where('id', '!=', $request->session()->getId())
            ->delete();

        // Regenerate session to prevent session fixation attacks
        $request->session()->regenerate();
        
        // Auto-verify email if not already verified (for internal systems)
        if (!$user->email_verified_at) {
            $user->email_verified_at = now();
            $user->save();
        }

        // Update user's last login timestamp
        $user->last_login_at = now();
        $user->save();

        // Ensure session is saved and committed before redirect
        $request->session()->save();

        // Determine redirect route based on user role
        $redirectRoute = match($user->role) {
            'admin' => 'admin.dashboard',
            'patient' => 'patient.dashboard',
            'staff' => 'staff.dashboard',
            default => 'dashboard',
        };

        // Use regular redirect - Inertia will handle it automatically
        return redirect()->route($redirectRoute);
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        // Get user ID before any operations (logout clears auth state)
        $userId = Auth::id();

        // Logout first: requires active session to clear auth state.
        // Must run before invalidate() so the guard can persist the cleared state.
        Auth::guard('web')->logout();

        // Invalidate session and regenerate CSRF token (Laravel-recommended order).
        // invalidate() triggers the session driver's destroy(), so we do not save() after.
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        if ($userId !== null) {
            DB::table('sessions')
                ->where('user_id', $userId)
                ->delete();
        }

        return redirect('/login');
    }
}
