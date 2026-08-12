import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle, ArrowLeft } from 'lucide-react';
import { FormEventHandler } from 'react';

import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';

export default function ForgotPassword({ status }: { status?: string }) {
    const { data, setData, post, processing, errors } = useForm<Required<{ email: string }>>({
        email: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('password.email'));
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
            <Head title="Forgot password" />

            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                {/* Back button moved to top */}
                <div className="mb-4">
                    <TextLink 
                        href={route('home')} 
                        className="inline-flex items-center text-sm font-medium text-green-600 hover:text-green-700 transition-colors"
                    >
                        <ArrowLeft className="mr-1 h-4 w-4" />
                        Back to Home
                    </TextLink>
                </div>
                
                <div className="bg-white py-8 px-4 shadow-xl rounded-xl sm:px-10 border border-gray-100">
                    <div className="mb-6 text-center">
                        <img 
                            src="/logo.png" 
                            alt="Smart Waste Management Logo" 
                            className="mx-auto h-20 w-auto mb-4"
                        />
                        <h2 className="text-2xl font-bold text-gray-800">Reset your password</h2>
                        <p className="mt-2 text-sm text-gray-600">Enter your email to receive a password reset link</p>
                    </div>

                    {status && <div className="mb-6 text-center text-sm font-medium text-green-600">{status}</div>}

                    <form className="flex flex-col gap-6" onSubmit={submit}>
                        <div className="grid gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="email" className="text-gray-700 font-medium">Email address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    placeholder="email@example.com"
                                    className={`w-full rounded-lg text-gray-800 border-gray-200 focus:border-green-500 focus:ring focus:ring-green-200 focus:ring-opacity-50 px-4 py-2 ${data.email ? 'bg-gray-100' : ''}`}
                                />
                                <InputError message={errors.email} />
                            </div>

                            <Button 
                                type="submit" 
                                className="mt-6 w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-lg transition-colors shadow-lg flex items-center justify-center" 
                                tabIndex={2} 
                                disabled={processing}
                            >
                                {processing ? (
                                    <>
                                        <LoaderCircle className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                                        Sending...
                                    </>
                                ) : (
                                    'Email password reset link'
                                )}
                            </Button>
                        </div>

                        <div className="text-gray-600 text-center text-sm">
                            Remember your password?{' '}
                            <TextLink 
                                href={route('login')} 
                                className="text-green-600 hover:text-green-700 font-medium" 
                                tabIndex={3}
                            >
                                Log in
                            </TextLink>
                        </div>
                    </form>
                    
                    <div className="mt-10 pt-6 border-t border-gray-100 text-center text-xs text-gray-500">
                        © 2025 Waste Xpress. All rights reserved.
                    </div>
                </div>
            </div>
        </div>
    );
}