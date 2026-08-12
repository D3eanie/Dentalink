import { NavFooter } from '@/components/nav-footer';
import NavMain from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import {
  LayoutGrid, Users, Calendar, MessageCircle, FileText,
  Stethoscope, Settings, Activity, AlertTriangle,
  BarChart2, Shield, ClipboardList, Clock, CreditCard,
  UserCheck, CalendarCheck, Clipboard, Pill, Heart,
  Bell, User, Archive, TrendingUp, Database,
  PhilippinePeso, Smile
} from 'lucide-react';
import AppLogo from './app-logo';

export function AppSidebar() {
    const { auth } = usePage().props as any;
    const userRole = auth.user?.role;

    let mainNavItems: NavItem[] = [];

    // Admin - Full system administration for dental clinic
    if (userRole === 'admin') {
        mainNavItems = [
            {
                title: 'Dashboard',
                href: '/admin/dashboard',
                icon: LayoutGrid,
            },
            {
                title: 'Patient Records',
                href: '/admin/patients',
                icon: Users,
            },
            {
                title: 'Appointments',
                href: '/admin/appointments',
                icon: Calendar,
            },
            // {
            //     title: 'Schedules',
            //     href: '/admin/schedules',
            //     icon: Clock,
            // },
            {
                title: 'Services',
                href: '/admin/services',
                icon: Stethoscope,
            },
            {
                title: 'Service Transactions',
                href: '/admin/tooth-records',
                icon: Smile,
            },
            {
                title: 'Financial Records',
                href: '/admin/financial',
                icon: PhilippinePeso,
            },
            {
                title: 'User Management',
                href: '/admin/users',
                icon: Shield,
            },



        ];
    }
    // Staff - Dental professionals (dentists, hygienists, assistants, receptionists)
    else if (userRole === 'staff') {
        mainNavItems = [
            {
                title: 'Dashboard',
                href: '/staff/dashboard',
                icon: LayoutGrid,
            },
            {
                title: 'All Appointments',
                href: '/staff/appointments',
                icon: Calendar,
            },
            {
                title: 'My Schedule',
                href: '/staff/schedule',
                icon: Clock,
            },
            {
                title: 'Patient Records',
                href: '/staff/patients',
                icon: FileText,
            },
            {
                title: 'Service Transactions',
                href: '/staff/tooth-records',
                icon: Smile,
            },
           {
                title: 'Financial',
                href: '/staff/financial',
                icon: PhilippinePeso,
            },
            {
                title: 'Notifications',
                href: '/staff/notifications',
                icon: Bell,
            },

            //   {
            //     title: 'Treatment Plans',
            //     href: '/staff/treatment-plans',
            //     icon: Clipboard,
            // },

        ];
    }
    // Patient - Dental clinic patients
    else if (userRole === 'patient') {
        mainNavItems = [
            {
                title: 'Dashboard',
                href: '/patient/dashboard',
                icon: LayoutGrid,
            },
            {
                title: 'My Appointments',
                href: '/patient/appointments',
                icon: Calendar,
            },
            {
                title: 'Billing & Payments',
                href: '/patient/billing',
                icon: CreditCard,
            },
            {
                title: 'Notifications',
                href: '/patient/notifications',
                icon: Bell,
            },
        ];
    }

    // Get the appropriate dashboard URL based on role
    const getDashboardUrl = () => {
        switch (userRole) {
            case 'admin':
                return '/admin/dashboard';
            case 'staff':
                return '/staff/dashboard';
            case 'patient':
                return '/patient/dashboard';
            default:
                return '/dashboard';
        }
    };

    // Get role display name
    const getRoleDisplayName = () => {
        switch (userRole) {
            case 'admin':
                return 'Administrator';
            case 'staff':
                return 'Staff Portal';
            case 'patient':
                return 'Patient Portal';
            default:
                return 'Dental Clinic';
        }
    };

    return (
        <Sidebar collapsible="icon" variant="inset" className="bg-white border-r">
            <SidebarHeader className="border-b">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={getDashboardUrl()}>
                                <AppLogo />
                                <div className="flex flex-col gap-0.5 leading-none">
                                    <span className="font-semibold text-sm">Up North</span>
                                    <span className="text-xs text-muted-foreground">{getRoleDisplayName()}</span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter className="border-t">
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
