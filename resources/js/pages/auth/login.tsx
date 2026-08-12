import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { FormEventHandler, useState, useEffect } from 'react';

import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type LoginForm = {
  email: string;
  password: string;
  remember: boolean;
};

interface LoginProps {
  status?: string;
  canResetPassword: boolean;
  errors?: any;
}

export default function Login({ status, canResetPassword, errors }: LoginProps) {
  const [showPassword, setShowPassword] = useState(false);

  // Persistent lockout timer
  const [lockoutSeconds, setLockoutSeconds] = useState<number | null>(null);

  const { data, setData, post, processing, reset } =
    useForm<Required<LoginForm>>({
      email: '',
      password: '',
      remember: false,
    });

  // 1. Detect lockout from Laravel ONCE and store timer in localStorage
  useEffect(() => {
    if (errors?.email && errors.email.includes("Too many login attempts")) {
      const match = errors.email.match(/(\d+)\s*seconds?/i);
      if (match) {
        const seconds = parseInt(match[1], 10);
        const lockoutUntil = Date.now() + seconds * 1000;

        localStorage.setItem("lockout_until", lockoutUntil.toString());
        setLockoutSeconds(seconds);
      }
    }
  }, [errors]);

  // 2. Restore countdown from localStorage on page load
  useEffect(() => {
    const saved = localStorage.getItem("lockout_until");
    if (!saved) return;

    const lockoutUntil = parseInt(saved, 10);
    const now = Date.now();

    if (now < lockoutUntil) {
      const remaining = Math.floor((lockoutUntil - now) / 1000);
      setLockoutSeconds(remaining);
    }
  }, []);

  // 3. Live countdown (persistent)
  useEffect(() => {
    if (!lockoutSeconds) return;

    const interval = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev && prev > 1) return prev - 1;

        localStorage.removeItem("lockout_until");
        return null;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [lockoutSeconds]);

  const submit: FormEventHandler = (e) => {
    e.preventDefault();

    // Ensure route helper is available
    if (typeof route === 'undefined') {
      console.error('Route helper is not available');
      return;
    }

    try {
      post(route('login'), {
        onSuccess: () => {
          // Inertia should handle redirect automatically
          reset('password');
        },
        onFinish: () => {
          reset('password');
        },
        onError: (errors) => {
          // Errors will be displayed automatically
          console.error('Login errors:', errors);
        },
      });
    } catch (error) {
      console.error('Error submitting login form:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Head title="Login - Dental Clinic" />

      <div className="sm:mx-auto sm:w-full sm:max-w-xl">

        {/* Back link */}
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

          {/* Header */}
          <div className="mb-6 text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-teal-500 rounded-xl flex items-center justify-center mr-3">
                <img src="logo.png" alt="Logo" className="w-15 h-15 object-contain" />
              </div>
              <div>
                <span className="text-2xl font-bold text-blue-600">Dental Clinic</span>
                <p className="text-xs text-gray-500">Dental Clinic Management System</p>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Log in to your account</h2>
            <p className="mt-2 text-sm text-gray-600">Welcome back</p>
          </div>

          {/* Laravel status message */}
          {status && (
            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              {status}
            </div>
          )}

          {/* Normal validation errors (not lockout) */}
          {errors?.email && !errors.email.includes("Too many login attempts") && (
            <InputError message={errors.email} />
          )}

          <form className="flex flex-col gap-6" onSubmit={submit}>
            <div className="grid gap-6">

              {/* Email */}
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-gray-700 font-medium">
                  Email address
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoFocus
                  disabled={lockoutSeconds !== null}
                  value={data.email}
                  onChange={(e) => setData('email', e.target.value)}
                  placeholder="your.email@example.com"
                />
              </div>

              {/* Password */}
              <div className="grid gap-2">
                <Label htmlFor="password" className="text-gray-700 font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    disabled={lockoutSeconds !== null}
                    value={data.password}
                    onChange={(e) => setData('password', e.target.value)}
                    placeholder="Your password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
                    onClick={() => setShowPassword((s) => !s)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Remember me & Forgot password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="remember"
                    name="remember"
                    disabled={lockoutSeconds !== null}
                    checked={data.remember}
                    onCheckedChange={(v) => setData('remember', !!v)}
                  />
                  <Label htmlFor="remember" className="text-gray-600">
                    Remember me
                  </Label>
                </div>
                {canResetPassword && (
                  <TextLink
                    href={route('password.request')}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Forgot password?
                  </TextLink>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="mt-2 w-full bg-gradient-to-r from-blue-600 to-teal-600 text-white py-3 rounded-lg shadow"
                disabled={processing || lockoutSeconds !== null}
              >
                {processing ? (
                  <>
                    <LoaderCircle className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                    Logging in...
                  </>
                ) : (
                  'Log in'
                )}
              </Button>

              {/* 🔥 Lockout countdown under the button */}
              {lockoutSeconds !== null && (
                <div className="mt-4 text-center text-red-600 font-semibold text-sm">
                  Too many login attempts. Try again in <strong>{lockoutSeconds}</strong> seconds.
                </div>
              )}
            </div>

            <div className="text-gray-600 text-center text-sm">
              Don’t have an account?{' '}
              <TextLink
                href={route('register')}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Create one
              </TextLink>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t text-center text-xs text-gray-500">
            © 2025 Dental Clinic Management System. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
}
