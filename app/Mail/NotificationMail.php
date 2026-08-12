<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use App\Models\Notification as AppNotification;

class NotificationMail extends Mailable
{
    use SerializesModels;

    public AppNotification $notificationModel;

    public function __construct(AppNotification $notification)
    {
        $this->notificationModel = $notification;
    }

    public function build()
    {
        return $this->from(config('mail.from.address'), config('mail.from.name'))
                    ->subject($this->notificationModel->title)
                    ->markdown('emails.notification', [
                        'notification' => $this->notificationModel,
                        'user' => $this->notificationModel->user,
                    ]);
    }
}
