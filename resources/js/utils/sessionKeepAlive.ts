/**
 * Session Keep-Alive Utility
 *
 * Prevents session expiration by pinging the server periodically
 * and resetting the inactivity timer when the user is active.
 */

export class SessionKeepAlive {
    private pingInterval: ReturnType<typeof setInterval> | null = null;
    private inactivityTimeout: ReturnType<typeof setTimeout> | null = null;
    private isActive: boolean = true;
    private lastActivityTime: number = Date.now();
    private pingIntervalMs: number = 5 * 60 * 1000; // 5 minutes
    private inactivityThresholdMs: number = 8 * 60 * 1000; // 8 minutes (matches SESSION_LIFETIME)

    constructor() {
        this.setupEventListeners();
        this.startPingInterval();
    }

    /**
     * Setup activity listeners to track user interaction
     */
    private setupEventListeners(): void {
        const events = [
            'mousedown',
            'keydown',
            'scroll',
            'touchstart',
            'click',
            'focus'
        ];

        events.forEach(event => {
            document.addEventListener(event, () => this.resetInactivityTimer(), { passive: true });
        });
    }

    /**
     * Reset the inactivity timer when user is active
     */
    private resetInactivityTimer(): void {
        this.lastActivityTime = Date.now();
        this.isActive = true;

        // Clear existing timeout
        if (this.inactivityTimeout) {
            clearTimeout(this.inactivityTimeout);
        }

        // Set new timeout for inactivity
        this.inactivityTimeout = setTimeout(() => {
            this.isActive = false;
            console.warn('User has been inactive for too long');
        }, this.inactivityThresholdMs);
    }

    /**
     * Start the periodic ping to keep session alive
     */
    private startPingInterval(): void {
        this.pingInterval = setInterval(() => {
            this.pingServer();
        }, this.pingIntervalMs);
    }

    /**
     * Ping the server to keep session alive
     */
    private pingServer(): void {
        const timeSinceLastActivity = Date.now() - this.lastActivityTime;

        // Only ping if user has been active in the last 8 minutes
        if (timeSinceLastActivity < this.inactivityThresholdMs) {
            fetch('/api/ping', {
                method: 'HEAD',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'include'
            })
            .then(() => {
                console.debug('Session ping successful');
            })
            .catch((error) => {
                console.warn('Session ping failed:', error);
                // Don't reload on ping failure - let inactivity middleware handle it
            });
        }
    }

    /**
     * Stop the keep-alive mechanism (useful for cleanup)
     */
    public stop(): void {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }

        if (this.inactivityTimeout) {
            clearTimeout(this.inactivityTimeout);
            this.inactivityTimeout = null;
        }
    }

    /**
     * Get current activity status
     */
    public getIsActive(): boolean {
        return this.isActive;
    }

    /**
     * Get time since last activity
     */
    public getTimeSinceLastActivity(): number {
        return Date.now() - this.lastActivityTime;
    }

    /**
     * Manually trigger activity (useful for specific actions)
     */
    public recordActivity(): void {
        this.resetInactivityTimer();
    }
}

// Initialize globally on page load
let sessionKeepAlive: SessionKeepAlive | null = null;

export function initializeSessionKeepAlive(): void {
    if (!sessionKeepAlive && typeof window !== 'undefined') {
        sessionKeepAlive = new SessionKeepAlive();
        console.info('Session keep-alive initialized');
    }
}

export function getSessionKeepAlive(): SessionKeepAlive | null {
    return sessionKeepAlive;
}

export function stopSessionKeepAlive(): void {
    if (sessionKeepAlive) {
        sessionKeepAlive.stop();
        sessionKeepAlive = null;
        console.info('Session keep-alive stopped');
    }
}
