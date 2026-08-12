import '../css/app.css';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import Swal from 'sweetalert2';
import { route as ziggyRoute, type RouteName } from 'ziggy-js';
import { initializeTheme } from './hooks/use-appearance';

const appName = import.meta.env.VITE_APP_NAME || 'Pet Connect';

const originalSwalFire = Swal.fire.bind(Swal);
Swal.fire = (async (...args: any[]) => {
    let options: any;

    if (args.length === 1 && typeof args[0] === 'object') {
        options = { ...args[0] };
    } else if (typeof args[0] === 'string') {
        const [title, text, icon] = args;
        options = { title, text, icon };
    } else {
        return originalSwalFire(...args as any);
    }

    if (options?.icon === 'success') {
        const existingDidOpen = options.didOpen;
        options = {
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            timer: options.timer ?? 2000,
            timerProgressBar: true,
            ...options,
            didOpen: (el: HTMLElement) => {
                Swal.showLoading();
                if (typeof existingDidOpen === 'function') {
                    existingDidOpen(el);
                }
            },
        };
    }

    return originalSwalFire(options);
}) as typeof Swal.fire;

createInertiaApp({
    title: (title) => `${title}  ${appName}`,
    resolve: (name) => resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),
    setup({ el, App, props }) {
        const root = createRoot(el);

        // Initialize Ziggy route helper from Inertia props
        const ziggy = (props.initialPage?.props as any)?.ziggy;
        if (ziggy) {
            (window as any).route = <T extends RouteName>(
                name: T,
                params?: any,
                absolute?: boolean
            ) => {
                try {
                    return ziggyRoute(name, params, absolute, {
                        ...ziggy,
                        location: new URL(ziggy.location),
                    });
                } catch (error) {
                    console.error('Route helper error:', error, 'Route name:', name);
                    // Fallback to basic route generation
                    const routeName = String(name);
                    return `/${routeName.replace(/\./g, '/')}`;
                }
            };
        } else {
            // Fallback route helper if ziggy is not available
            (window as any).route = (name: string) => {
                console.warn('Ziggy not available, using fallback route for:', name);
                return `/${String(name).replace(/\./g, '/')}`;
            };
        }

        // Add global error handlers to catch and log errors
        window.addEventListener('error', (event) => {
            console.error('Global error caught:', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error
            });
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
        });

        root.render(<App {...props} />);
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();
