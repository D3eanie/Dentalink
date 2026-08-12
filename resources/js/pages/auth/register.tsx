import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { FormEventHandler, useState } from 'react';
import Swal from 'sweetalert2'; 

import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type RegisterForm = {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    role: string;
    phone: string;
    address: string;
    birthday: string;
    gender: string;
};

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm<Required<RegisterForm>>({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        role: 'patient', // Always set to patient
        phone: '',
        address: '',
        birthday: '',
        gender: '',
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        
        // Validate phone number length
        if (data.phone.replace(/\D/g, '').length > 11) {
            Swal.fire({
                icon: 'error',
                title: 'Validation Error',
                text: 'Phone number cannot exceed 11 digits.',
                confirmButtonText: 'OK',
            });
            return;
        }
        
        // Validate age (minimum 1 year old)
        const birthDate = new Date(data.birthday);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        const dayDiff = today.getDate() - birthDate.getDate();
        const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
        
        if (actualAge < 1) {
            Swal.fire({
                icon: 'error',
                title: 'Registration Requirement',
                text: 'You must be at least 1 year old to register.',
                confirmButtonText: 'OK',
            });
            return;
        }
        
        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
            <Head title="Register - Dental Clinic" />

            <div className="sm:mx-auto sm:w-full sm:max-w-4xl">
                {/* Back button moved to top */}
                <div className="mb-4">
                    <TextLink 
                        href={route('home')} 
                        className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                    >
                        <ArrowLeft className="mr-1 h-4 w-4" />
                        Back to Home
                    </TextLink>
                </div>
                
                <div className="bg-white py-8 px-4 shadow-xl rounded-xl sm:px-10 border border-gray-100">
                    <div className="mb-8 text-center">
                        <div className="flex items-center justify-center mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-teal-500 rounded-xl flex items-center justify-center mr-3">
                                 <img src="logo.png" alt="Logo" className="w-15 h-15 object-contain" />
                            </div>
                            <div>
                                <span className="text-2xl font-bold text-blue-600">Dental Clinic</span>
                                <p className="text-xs text-gray-500">Dental Clinic Management System</p>
                            </div>
                        </div>
                        <p className="mt-2 text-sm text-gray-600">Create your patient account</p>
                    </div>

                    <form className="flex flex-col gap-6" onSubmit={submit}>
                        {/* Two Column Layout */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Left Column - Personal Information */}
                            <div className="space-y-6">
                                <div className="pb-4 border-b border-gray-200">
                                    <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                                        <svg className="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                        </svg>
                                        Personal Information
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-1">Tell us about yourself</p>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="name" className="text-gray-700 font-medium">Full name *</Label>
                                    <Input
                                        id="name"
                                        type="text"
                                        required
                                        autoFocus
                                        tabIndex={1}
                                        autoComplete="name"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        placeholder="Your full name"
                                        className="w-full rounded-lg border-gray-200 text-gray-800 focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 px-4 py-2"
                                    />
                                    <InputError message={errors.name} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="email" className="text-gray-700 font-medium">Email address *</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        required
                                        tabIndex={2}
                                        autoComplete="email"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                        placeholder="your.email@example.com"
                                        className="w-full rounded-lg border-gray-200 text-gray-800 focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 px-4 py-2"
                                    />
                                    <InputError message={errors.email} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="phone" className="text-gray-700 font-medium">Phone number *</Label>
                                    <Input
                                        id="phone"
                                        type="tel"
                                        required
                                        tabIndex={3}
                                        autoComplete="tel"
                                        value={data.phone}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            const digitsOnly = value.replace(/\D/g, '');
                                            if (digitsOnly.length <= 11) {
                                                setData('phone', value);
                                            }
                                        }}
                                        placeholder="+63 912 345 6789"
                                        className="w-full rounded-lg border-gray-200 text-gray-800 focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 px-4 py-2"
                                    />
                                    <InputError message={errors.phone} />
                                    <div className="text-xs text-gray-500 mt-1">
                                        Maximum 11 digits
                                    </div>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="address" className="text-gray-700 font-medium">Address</Label>
                                    <Input
                                        id="address"
                                        type="text"
                                        tabIndex={4}
                                        autoComplete="address-line1"
                                        value={data.address}
                                        onChange={(e) => setData('address', e.target.value)}
                                        placeholder="Your complete address"
                                        className="w-full rounded-lg border-gray-200 text-gray-800 focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 px-4 py-2"
                                    />
                                    <InputError message={errors.address} />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="birthday" className="text-gray-700 font-medium">Birthday *</Label>
                                        <Input
                                            id="birthday"
                                            type="date"
                                            required
                                            tabIndex={5}
                                            value={data.birthday}
                                            onChange={(e) => setData('birthday', e.target.value)}
                                            max={new Date().toISOString().split('T')[0]}
                                            className="w-full rounded-lg border-gray-200 text-gray-800 focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 px-4 py-2"
                                        />
                                        <InputError message={errors.birthday} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="gender" className="text-gray-700 font-medium">Gender *</Label>
                                        <Select onValueChange={(value) => setData('gender', value)} required>
                                            <SelectTrigger className="w-full rounded-lg border-gray-200 text-gray-800 focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 px-4 py-2">
                                                <SelectValue placeholder="Select gender" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="male">
                                                    <div className="flex items-center">
                                                        <svg className="w-4 h-4 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM8 9a2 2 0 114 0 2 2 0 01-4 0z" />
                                                        </svg>
                                                        Male
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="female">
                                                    <div className="flex items-center">
                                                        <svg className="w-4 h-4 mr-2 text-pink-600" fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM8 9a2 2 0 114 0 2 2 0 01-4 0z" />
                                                        </svg>
                                                        Female
                                                    </div>
                                                </SelectItem>
                                              
                                            </SelectContent>
                                        </Select>
                                        <InputError message={errors.gender} />
                                    </div>
                                </div>
                            </div>

                            {/* Right Column - Account Security */}
                            <div className="space-y-6">
                                <div className="pb-4 border-b border-gray-200">
                                    <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                                        <svg className="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                        </svg>
                                        Account Security
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-1">Create a secure password for your account</p>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="password" className="text-gray-700 font-medium">Password *</Label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            required
                                            tabIndex={6}
                                            autoComplete="new-password"
                                            value={data.password}
                                            onChange={(e) => setData('password', e.target.value)}
                                            placeholder="Create a strong password"
                                            className="w-full rounded-lg border-gray-200 text-gray-800 focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 px-4 py-2 pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                                        >
                                            {showPassword ? (
                                                <EyeOff className="h-5 w-5" />
                                            ) : (
                                                <Eye className="h-5 w-5" />
                                            )}
                                        </button>
                                    </div>
                                    <InputError message={errors.password} />
                                    <div className="text-xs text-gray-500 mt-1">
                                        Password should be at least 8 characters long
                                    </div>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="password_confirmation" className="text-gray-700 font-medium">Confirm password *</Label>
                                    <div className="relative">
                                        <Input
                                            id="password_confirmation"
                                            type={showConfirmPassword ? "text" : "password"}
                                            required
                                            tabIndex={7}
                                            autoComplete="new-password"
                                            value={data.password_confirmation}
                                            onChange={(e) => setData('password_confirmation', e.target.value)}
                                            placeholder="Confirm your password"
                                            className="w-full rounded-lg border-gray-200 text-gray-800 focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 px-4 py-2 pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                                        >
                                            {showConfirmPassword ? (
                                                <EyeOff className="h-5 w-5" />
                                            ) : (
                                                <Eye className="h-5 w-5" />
                                            )}
                                        </button>
                                    </div>
                                    <InputError message={errors.password_confirmation} />
                                </div>

                                {/* Security Tips */}
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <h4 className="text-sm font-medium text-blue-800 mb-2 flex items-center">
                                        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                        </svg>
                                        Password Tips
                                    </h4>
                                    <ul className="text-xs text-blue-700 space-y-1">
                                        <li>• Use a mix of uppercase and lowercase letters</li>
                                        <li>• Include numbers and special characters</li>
                                        <li>• Avoid common words or personal information</li>
                                        <li>• Make it at least 8 characters long</li>
                                    </ul>
                                </div>
                                
                            </div>
                        </div>

                        {/* Submit Button - Full Width */}
                        <div className="mt-8 pt-6 border-t border-gray-200">
                            <Button 
                                type="submit" 
                                className="w-full bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white font-medium py-4 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center text-lg" 
                                tabIndex={8} 
                                disabled={processing}
                            >
                                {processing ? (
                                    <>
                                        <LoaderCircle className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" />
                                        Creating your account...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        Create Patient Account
                                    </>
                                )}
                            </Button>

                            <div className="text-gray-600 text-center text-sm mt-4">
                                Already have an account?{' '}
                                <TextLink 
                                    href={route('login')} 
                                    className="text-blue-600 hover:text-blue-700 font-medium" 
                                    tabIndex={9}
                                >
                                    Sign in here
                                </TextLink>
                            </div>
                        </div>
                    </form>
                    
                    <div className="mt-6 pt-6 border-t border-gray-100">
                        <div className="text-center text-xs text-gray-500 mb-3">
                            By registering, you agree to our{' '}
                            <a href="#" className="text-blue-600 hover:text-blue-700">terms of service</a>
                            {' '}and{' '}
                            <a href="#" className="text-blue-600 hover:text-blue-700">privacy policy</a>
                        </div>
                        <div className="text-center text-xs text-gray-400">
                            © 2025 Dental Clinic Management System. All rights reserved.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}