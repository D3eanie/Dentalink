import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';

interface ResetPasswordProps {
    token: string;
    email: string;
}

type ResetPasswordForm = {
    token: string;
    email: string;
    password: string;
    password_confirmation: string;
};

export default function ResetPassword({ token, email }: ResetPasswordProps) {
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
    
    const { data, setData, post, processing, errors, reset } = useForm<Required<ResetPasswordForm>>({
        token: token,
        email: email,
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('password.store'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
            <Head title="Reset password" />

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
                        <p className="mt-2 text-sm text-gray-600">Please enter your new password below</p>
                    </div>

                    <form className="flex flex-col gap-6" onSubmit={submit}>
                        <div className="grid gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="email" className="text-gray-700 font-medium">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    autoComplete="email"
                                    value={data.email}
                                    readOnly
                                    onChange={(e) => setData('email', e.target.value)}
                                    className="w-full rounded-lg text-gray-800 border-gray-200 focus:border-green-500 focus:ring focus:ring-green-200 focus:ring-opacity-50 px-4 py-2 bg-gray-50"
                                />
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password" className="text-gray-700 font-medium">Password</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        autoComplete="new-password"
                                        value={data.password}
                                        autoFocus
                                        tabIndex={1}
                                        onChange={(e) => setData('password', e.target.value)}
                                        placeholder="New password"
                                        className={`w-full rounded-lg text-gray-800 border-gray-200 focus:border-green-500 focus:ring focus:ring-green-200 focus:ring-opacity-50 px-4 py-2 ${data.password ? 'bg-gray-100' : ''}`}
                                    />
                                    <button 
                                        type="button"
                                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 focus:outline-none"
                                        onClick={() => setShowPassword(!showPassword)}
                                        tabIndex={-1}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-5 w-5" aria-hidden="true" />
                                        ) : (
                                            <Eye className="h-5 w-5" aria-hidden="true" />
                                        )}
                                    </button>
                                </div>
                                <InputError message={errors.password} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password_confirmation" className="text-gray-700 font-medium">Confirm password</Label>
                                <div className="relative">
                                    <Input
                                        id="password_confirmation"
                                        type={showPasswordConfirmation ? "text" : "password"}
                                        name="password_confirmation"
                                        autoComplete="new-password"
                                        value={data.password_confirmation}
                                        tabIndex={2}
                                        onChange={(e) => setData('password_confirmation', e.target.value)}
                                        placeholder="Confirm password"
                                        className={`w-full rounded-lg text-gray-800 border-gray-200 focus:border-green-500 focus:ring focus:ring-green-200 focus:ring-opacity-50 px-4 py-2 ${data.password_confirmation ? 'bg-gray-100' : ''}`}
                                    />
                                    <button 
                                        type="button"
                                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 focus:outline-none"
                                        onClick={() => setShowPasswordConfirmation(!showPasswordConfirmation)}
                                        tabIndex={-1}
                                    >
                                        {showPasswordConfirmation ? (
                                            <EyeOff className="h-5 w-5" aria-hidden="true" />
                                        ) : (
                                            <Eye className="h-5 w-5" aria-hidden="true" />
                                        )}
                                    </button>
                                </div>
                                <InputError message={errors.password_confirmation} />
                            </div>

                            <Button 
                                type="submit" 
                                className="mt-6 w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-lg transition-colors shadow-lg flex items-center justify-center" 
                                tabIndex={3} 
                                disabled={processing}
                            >
                                {processing ? (
                                    <>
                                        <LoaderCircle className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                                        Resetting...
                                    </>
                                ) : (
                                    'Reset password'
                                )}
                            </Button>
                        </div>

                        <div className="text-gray-600 text-center text-sm">
                            Remember your password?{' '}
                            <TextLink 
                                href={route('login')} 
                                className="text-green-600 hover:text-green-700 font-medium" 
                                tabIndex={4}
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