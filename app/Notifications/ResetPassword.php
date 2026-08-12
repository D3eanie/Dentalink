<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\ResetPassword as BaseResetPassword;
use Illuminate\Notifications\Messages\MailMessage;

class ResetPassword extends BaseResetPassword
{
    /**
     * The plain text token (not hashed).
     *
     * @var string
     */
    protected $plainToken;

    /**
     * Create a new notification instance.
     *
     * @param  string  $token
     * @return void
     */
    public function __construct($token)
    {
        parent::__construct($token);
        $this->plainToken = $token;
    }

    /**
     * Build the mail representation of the notification.
     *
     * @param  mixed  $notifiable
     * @return \Illuminate\Notifications\Messages\MailMessage
     */
    public function toMail($notifiable)
    {
        // Generate URL with plain text token
        $email = $notifiable->getEmailForPasswordReset();
        $url = route('password.reset', ['token' => $this->plainToken], false);
        $url = url($url . '?email=' . urlencode($email));

        return (new MailMessage)
            ->subject('Reset Your Password - ' . config('app.name'))
            ->markdown('emails.reset-password', [
                'url' => $url,
                'user' => $notifiable,
                'token' => $this->plainToken,
            ]);
    }
}
