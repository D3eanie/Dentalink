import { type BreadcrumbItem } from '@/types';
import { Transition } from '@headlessui/react';
import { Head, router } from '@inertiajs/react';
import { Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { useState } from 'react';

import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Email verification',
        href: '/settings/email-verification',
    },
];

interface EmailVerificationProps {
    readonly user: {
        readonly id: number;
        readonly email: string;
        readonly email_verified_at: string | null;
    };
    readonly mustVerifyEmail: boolean;
    readonly status?: string;
}

export default function EmailVerification({ user, mustVerifyEmail, status }: EmailVerificationProps) {
    const isVerified = user.email_verified_at !== null;
    const [isLoading, setIsLoading] = useState(false);

    const handleSendVerification = () => {
        setIsLoading(true);
        router.post(route('email-verification.send'), {}, {
            onFinish: () => setIsLoading(false),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Email verification" />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall
                        title="Email verification"
                        description="Verify your email address to ensure account security"
                    />

                    {/* Current Email Status */}
                    <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
                        <div className="flex items-start gap-4">
                            <div className="flex-1">
                                <h3 className="font-semibold text-gray-900 dark:text-white">Current Email Address</h3>
                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{user.email}</p>

                                <div className="mt-4 flex items-center gap-2">
                                    {isVerified ? (
                                        <>
                                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                                            <span className="text-sm font-medium text-green-600">
                                                Verified on {new Date(user.email_verified_at).toLocaleDateString()}
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <AlertCircle className="h-5 w-5 text-amber-600" />
                                            <span className="text-sm font-medium text-amber-600">Not verified</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Verification Status Messages */}
                    {status === 'verification-link-sent' && (
                        <Transition
                            show={true}
                            enter="transition ease-in-out"
                            enterFrom="opacity-0 translate-y--2"
                            leave="transition ease-in-out"
                            leaveTo="opacity-0"
                        >
                            <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-900/20">
                                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                                    ✓ Verification link sent successfully!
                                </p>
                                <p className="mt-1 text-sm text-green-700 dark:text-green-300">
                                    Check your email inbox for the verification link. The link is valid for 24 hours.
                                </p>
                            </div>
                        </Transition>
                    )}

                    {status === 'Email already verified' && (
                        <Transition
                            show={true}
                            enter="transition ease-in-out"
                            enterFrom="opacity-0 translate-y--2"
                            leave="transition ease-in-out"
                            leaveTo="opacity-0"
                        >
                            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-900/20">
                                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                                    ℹ Your email is already verified
                                </p>
                            </div>
                        </Transition>
                    )}

                    {/* Verification Instructions */}
                    {!isVerified && (
                        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-900/20">
                            <h4 className="font-semibold text-blue-900 dark:text-blue-100">Why verify your email?</h4>
                            <ul className="mt-2 space-y-1 text-sm text-blue-800 dark:text-blue-200">
                                <li>• Secure your account from unauthorized access</li>
                                <li>• Enable important security notifications</li>
                                <li>• Unlock advanced account features</li>
                            </ul>
                        </div>
                    )}

                    {/* Action Button */}
                    <div>
                        {!isVerified && (
                            <Button
                                onClick={handleSendVerification}
                                disabled={isLoading}
                                className="gap-2"
                            >
                                <Mail className="h-4 w-4" />
                                {isLoading ? 'Sending...' : 'Send Verification Email'}
                            </Button>
                        )}

                        {isVerified && (
                            <div className="flex items-center gap-2 text-sm text-green-600">
                                <CheckCircle2 className="h-5 w-5" />
                                <span>Your email address is verified</span>
                            </div>
                        )}
                    </div>

                    {/* Additional Information */}
                    {!isVerified && (
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
                            <h4 className="font-semibold text-gray-900 dark:text-white">To verify your email:</h4>
                            <ol className="mt-2 space-y-2 text-sm text-gray-700 dark:text-gray-300">
                                <li>1. Click the button above to send a verification email</li>
                                <li>2. Check your inbox (and spam folder) for the verification email</li>
                                <li>3. Click the link in the email to verify your address</li>
                                <li>4. You'll be automatically logged in after verification</li>
                            </ol>
                        </div>
                    )}
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
