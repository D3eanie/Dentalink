<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Session\TokenMismatchException;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class DebugCsrfToken
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        try {
            return $next($request);
        } catch (TokenMismatchException $e) {
            Log::warning('CSRF Token Mismatch (419)', [
                'url' => $request->url(),
                'method' => $request->method(),
                'path' => $request->path(),
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'session_id' => $request->session()?->getId(),
                'has_csrf_token_header' => $request->hasHeader('X-CSRF-TOKEN'),
                'has_session_cookie' => $request->hasCookie(config('session.cookie')),
            ]);

            throw $e;
        }
    }
}
