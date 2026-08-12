<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class CheckInactivity
{
    /**
     * Handle an incoming request.
     * 
     * Checks if the user has been inactive for more than the configured session lifetime
     * and logs them out if so.
     * 
     * Note: Laravel's built-in session middleware already handles session expiration,
     * so this middleware is optional and provides more explicit control.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Only check for authenticated users
        if (Auth::check() && $request->hasSession()) {
            $sessionId = $request->session()->getId();
            $inactivityTimeout = config('session.lifetime', 120) * 60; // Convert minutes to seconds
            
            // Get the session's last activity from the database
            $session = DB::table('sessions')
                ->where('id', $sessionId)
                ->first();
            
            if ($session && isset($session->last_activity)) {
                $timeSinceLastActivity = time() - $session->last_activity;
                
                // If user has been inactive for more than the timeout period
                if ($timeSinceLastActivity > $inactivityTimeout) {
                    // Log out the user
                    Auth::guard('web')->logout();
                    
                    // Invalidate the session
                    $request->session()->invalidate();
                    $request->session()->regenerateToken();
                    
                    // Delete the expired session from database
                    DB::table('sessions')->where('id', $sessionId)->delete();
                    
                    // Redirect to login with a message
                    if ($request->expectsJson()) {
                        return response()->json([
                            'message' => 'Your session has expired due to inactivity. Please log in again.',
                        ], 401);
                    }
                    
                    return redirect()->route('login')
                        ->with('status', 'Your session has expired due to inactivity. Please log in again.');
                }
            }
        }
        
        return $next($request);
    }
}

