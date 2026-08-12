import { HTMLAttributes } from 'react';

interface AppLogoIconProps extends HTMLAttributes<HTMLImageElement> {}

export default function AppLogoIcon({ className, ...props }: AppLogoIconProps) {
    return (
        <img
            src="/logo.png" // Use your new uploaded logo
            alt="Waste XPress Logo"
            className={`h-10 w-10 object-contain ${className ?? ''}`}
            {...props}
        />
    );
}
