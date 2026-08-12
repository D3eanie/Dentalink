<?php

namespace App\Auth;

use Illuminate\Auth\Passwords\DatabaseTokenRepository as BaseDatabaseTokenRepository;
use Illuminate\Support\Str;

class DatabaseTokenRepository extends BaseDatabaseTokenRepository
{
    /**
     * Create a new token record.
     *
     * @param  \Illuminate\Contracts\Auth\CanResetPassword  $user
     * @return string
     */
    public function create($user)
    {
        $email = $user->getEmailForPasswordReset();

        // Delete any existing tokens for this user
        $this->table()->where('email', $email)->delete();

        // Generate a plain text token (not hashed)
        $token = Str::random(64);

        // Store the token as plain text in the database
        $this->table()->insert([
            'email' => $email,
            'token' => $token,
            'created_at' => $this->freshTimestamp(),
        ]);

        return $token;
    }

    /**
     * Determine if the token has expired.
     *
     * @param  string  $createdAt
     * @return bool
     */
    protected function tokenExpired($createdAt)
    {
        return $this->getDateTime()->diffInMinutes(
            $this->getDateTime($createdAt)
        ) >= $this->expires;
    }

    /**
     * Delete a token record by token.
     *
     * @param  \Illuminate\Contracts\Auth\CanResetPassword  $user
     * @param  string  $token
     * @return void
     */
    public function delete($user)
    {
        $this->table()->where('email', $user->getEmailForPasswordReset())->delete();
    }

    /**
     * Determine if a token record exists and is valid.
     *
     * @param  \Illuminate\Contracts\Auth\CanResetPassword  $user
     * @param  string  $token
     * @return bool
     */
    public function exists($user, $token)
    {
        $record = $this->table()->where(
            'email',
            $user->getEmailForPasswordReset()
        )->first();

        // Token must exist, match exactly (PLAIN TEXT), and not be expired
        return $record &&
               hash_equals($record->token, $token) &&
               !$this->tokenExpired($record->created_at);
    }

    /**
     * Refresh the password reset token.
     *
     * @param  \Illuminate\Contracts\Auth\CanResetPassword  $user
     * @param  string  $token
     * @return string
     */
    public function refresh($user, $token)
    {
        // Delete the old token and create a new one
        $this->delete($user);
        return $this->create($user);
    }
}
