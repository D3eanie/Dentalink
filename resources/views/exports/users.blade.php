<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Users Export</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            font-size: 11px;
            color: #333;
            margin: 0;
            padding: 20px;
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #3B82F6;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #3B82F6;
            margin: 0;
            font-size: 24px;
        }
        .header p {
            margin: 5px 0;
            color: #666;
        }
        .summary {
            display: flex;
            justify-content: space-around;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }
        .summary-box {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            text-align: center;
            min-width: 150px;
            margin: 5px;
        }
        .summary-box h3 {
            margin: 0;
            color: #3B82F6;
            font-size: 14px;
        }
        .summary-box p {
            margin: 5px 0 0 0;
            font-size: 18px;
            font-weight: bold;
            color: #333;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            font-size: 10px;
        }
        th {
            background-color: #3B82F6;
            color: white;
            padding: 8px;
            text-align: left;
            font-weight: bold;
        }
        td {
            padding: 6px;
            border-bottom: 1px solid #ddd;
        }
        tr:nth-child(even) {
            background-color: #f8f9fa;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #ddd;
            text-align: center;
            color: #666;
            font-size: 10px;
        }
        .badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 9px;
            font-weight: bold;
        }
        .badge-active {
            background-color: #10B981;
            color: white;
        }
        .badge-inactive {
            background-color: #EF4444;
            color: white;
        }
        .badge-role {
            background-color: #6366F1;
            color: white;
        }
        .role {
            text-transform: capitalize;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Users Export Report</h1>
        @if($startDate && $endDate)
        <h2 style="color: #3B82F6; margin: 10px 0; font-size: 18px;">New Users Added: {{ $startDate }} to {{ $endDate }}</h2>
        @elseif($startDate)
        <h2 style="color: #3B82F6; margin: 10px 0; font-size: 18px;">Users Added From: {{ $startDate }}</h2>
        @elseif($endDate)
        <h2 style="color: #3B82F6; margin: 10px 0; font-size: 18px;">Users Added Until: {{ $endDate }}</h2>
        @endif
        @if($role)
        <p>Filter: {{ ucfirst($role) }} Users</p>
        @else
        <p>All Users</p>
        @endif
        <p>Generated on: {{ $exportDate }}</p>
        <p>Exported by: {{ $exportedBy }}</p>
        <p>Total Users: {{ $totalUsers }}</p>
    </div>

    <div class="summary">
        <div class="summary-box">
            <h3>Active Users</h3>
            <p>{{ $summary['active'] }}</p>
        </div>
        <div class="summary-box">
            <h3>Inactive Users</h3>
            <p>{{ $summary['inactive'] }}</p>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
            </tr>
        </thead>
        <tbody>
            @forelse($users as $user)
            <tr>
                <td>{{ $user->id }}</td>
                <td>{{ $user->name }}</td>
                <td>{{ $user->email }}</td>
                <td>{{ $user->phone ?? 'N/A' }}</td>
                <td>
                    <span class="badge badge-role role">{{ ucfirst($user->role) }}</span>
                </td>
                <td>
                    <span class="badge {{ $user->status === 'active' ? 'badge-active' : 'badge-inactive' }}">
                        {{ ucfirst($user->status) }}
                    </span>
                </td>
                <td>{{ \Carbon\Carbon::parse($user->created_at)->format('M d, Y') }}</td>
            </tr>
            @empty
            <tr>
                <td colspan="7" style="text-align: center; padding: 20px;">No users found</td>
            </tr>
            @endforelse
        </tbody>
    </table>

    @if($summary['by_role']->count() > 0)
    <div style="margin-top: 30px;">
        <h2 style="color: #3B82F6; font-size: 16px; border-bottom: 2px solid #3B82F6; padding-bottom: 5px;">Users by Role</h2>
        <table style="margin-top: 10px;">
            <thead>
                <tr>
                    <th>Role</th>
                    <th>Count</th>
                </tr>
            </thead>
            <tbody>
                @foreach($summary['by_role'] as $role => $count)
                <tr>
                    <td class="role">{{ ucfirst($role) }}</td>
                    <td>{{ $count }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
    </div>
    @endif

    <div class="footer">
        <p>This is a confidential document. Generated by Dental Clinic Management System.</p>
        <p>Page generated at {{ now()->format('Y-m-d H:i:s') }}</p>
    </div>
</body>
</html>

