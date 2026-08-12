import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { usePage } from '@inertiajs/react';
import { router } from '@inertiajs/react';
import { useEffect, useState, useRef } from 'react';
import { SharedData } from '@/types';

// Declare route helper type
declare const route: (name: string, params?: any, absolute?: boolean) => string;

const WARNING_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds
const LOGOUT_TIME = 10 * 60 * 1000; // 10 minutes in milliseconds

export function PageInactivityWarning() {
    const { auth } = usePage<SharedData>().props;
    const [showWarning, setShowWarning] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState(5);
    const [currentUrl, setCurrentUrl] = useState<string>('');
    const pageStartTimeRef = useRef<number | null>(null);
    const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
    const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);
    const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Only track for authenticated users
        if (!auth?.user) {
            return;
        }

        const checkUrlChange = () => {
            const newUrl = window.location.pathname + window.location.search;
            
            // If URL changed, reset timers
            if (newUrl !== currentUrl) {
                setCurrentUrl(newUrl);
                resetTimers();
                
                // Set new page start time
                pageStartTimeRef.current = Date.now();
                startTimers();
            }
        };

        // Initialize on mount
        const initialUrl = window.location.pathname + window.location.search;
        setCurrentUrl(initialUrl);
        pageStartTimeRef.current = Date.now();
        startTimers();

        // Listen for URL changes (Inertia navigation)
        const handleInertiaStart = () => {
            // Small delay to ensure URL has updated
            setTimeout(checkUrlChange, 100);
        };

        const handleInertiaSuccess = () => {
            checkUrlChange();
        };

        // Also check periodically in case URL changes without Inertia events
        const urlCheckInterval = setInterval(checkUrlChange, 2000);

        // Listen for Inertia navigation events
        window.addEventListener('inertia:start', handleInertiaStart);
        window.addEventListener('inertia:success', handleInertiaSuccess);

        return () => {
            clearTimers();
            clearInterval(urlCheckInterval);
            window.removeEventListener('inertia:start', handleInertiaStart);
            window.removeEventListener('inertia:success', handleInertiaSuccess);
        };
    }, [auth?.user, currentUrl]);

    const startTimers = () => {
        // Clear any existing timers
        clearTimers();

        // Set warning timer (5 minutes)
        warningTimerRef.current = setTimeout(() => {
            setShowWarning(true);
            // When warning appears, there are 2 more minutes until logout
            const remainingMinutes = 2;
            setTimeRemaining(remainingMinutes);
            
            // Start countdown - update every second
            countdownIntervalRef.current = setInterval(() => {
                if (pageStartTimeRef.current) {
                    const elapsed = Date.now() - pageStartTimeRef.current;
                    const remaining = Math.max(0, LOGOUT_TIME - elapsed);
                    const remainingMinutes = Math.ceil(remaining / (60 * 1000));
                    
                    setTimeRemaining(remainingMinutes);
                    
                    if (remaining <= 0) {
                        clearInterval(countdownIntervalRef.current!);
                        handleLogout();
                    }
                }
            }, 1000);
        }, WARNING_TIME);

        // Set logout timer (10 minutes total)
        logoutTimerRef.current = setTimeout(() => {
            handleLogout();
        }, LOGOUT_TIME);
    };

    const resetTimers = () => {
        clearTimers();
        setShowWarning(false);
        setTimeRemaining(5);
    };

    const clearTimers = () => {
        if (warningTimerRef.current) {
            clearTimeout(warningTimerRef.current);
            warningTimerRef.current = null;
        }
        if (logoutTimerRef.current) {
            clearTimeout(logoutTimerRef.current);
            logoutTimerRef.current = null;
        }
        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
        }
    };

    const handleLogout = () => {
        clearTimers();
        setShowWarning(false);
        
        // Log out using Inertia
        try {
            const logoutUrl = typeof route !== 'undefined' ? route('logout') : '/logout';
            router.post(logoutUrl, {}, {
                onSuccess: () => {
                    // Redirect will happen automatically
                },
            });
        } catch (error) {
            // Fallback to direct path if route helper is not available
            router.post('/logout', {}, {
                onSuccess: () => {
                    // Redirect will happen automatically
                },
            });
        }
    };

    const handleStayOnPage = () => {
        // Reset timers when user acknowledges the warning
        resetTimers();
        pageStartTimeRef.current = Date.now();
        startTimers();
    };

    // Don't render if user is not authenticated
    if (!auth?.user) {
        return null;
    }

    return (
        <Dialog open={showWarning} onOpenChange={(open) => {
            if (!open) {
                // If user closes dialog, still reset the timer
                handleStayOnPage();
            }
        }}>
            <DialogContent className="sm:max-w-md" onEscapeKeyDown={(e) => {
                e.preventDefault();
                handleStayOnPage();
            }} onPointerDownOutside={(e) => {
                e.preventDefault();
            }}>
                <DialogHeader>
                    <DialogTitle>Session Warning</DialogTitle>
                    <DialogDescription>
                        You have been on this page for more than 5 minutes. You will be automatically logged out in{' '}
                        <strong className="text-foreground">{timeRemaining}</strong> minute{timeRemaining !== 1 ? 's' : ''} if you remain on this page.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="sm:justify-end">
                    <Button
                        type="button"
                        variant="default"
                        onClick={handleStayOnPage}
                    >
                        Stay on Page
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleLogout}
                    >
                        Log Out Now
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

