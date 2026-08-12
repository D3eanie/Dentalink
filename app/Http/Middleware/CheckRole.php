<?php

// app/Http/Middleware/CheckRole.php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string $role): Response
    {
        // Check if user is authenticated
        if (!$request->user()) {
            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Authentication required'
                ], 401);
            }
            return redirect()->route('login');
        }

        // Check if user has the required role
        if ($request->user()->role !== $role) {
            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Insufficient permissions'
                ], 403);
            }
            
            // Redirect based on user's actual role
            return match($request->user()->role) {
                'admin' => redirect()->route('admin.dashboard'),
                'employee' => redirect()->route('employee.dashboard'),
                'customer' => redirect()->route('customer.dashboard'),
                default => redirect()->route('home')
            };
        }

        return $next($request);
    }
}