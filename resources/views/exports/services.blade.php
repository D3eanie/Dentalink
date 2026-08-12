<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Services Export</title>
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
        .price {
            font-weight: bold;
            color: #059669;
        }
        .category {
            text-transform: capitalize;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Services Export Report</h1>
        <p>Generated on: {{ $exportDate }}</p>
        <p>Exported by: {{ $exportedBy }}</p>
        <p>Total Services: {{ $totalServices }}</p>
    </div>

    <div class="summary">
        <div class="summary-box">
            <h3>Active Services</h3>
            <p>{{ $summary['active'] }}</p>
        </div>
        <div class="summary-box">
            <h3>Inactive Services</h3>
            <p>{{ $summary['inactive'] }}</p>
        </div>
        <div class="summary-box">
            <h3>Total Revenue Potential</h3>
            <p class="price">&#8369;{{ number_format($summary['total_revenue'], 2) }}</p>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Duration</th>
                <th>Appointments</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            @forelse($services as $service)
            <tr>
                <td>{{ $service->id }}</td>
                <td>{{ $service->name }}</td>
                <td class="category">{{ ucfirst($service->category) }}</td>
                <td class="price">&#8369;{{ number_format($service->price, 2) }}</td>
                <td>{{ $service->duration_minutes }} min</td>
                <td>{{ $service->appointments_count }}</td>
                <td>
                    <span class="badge {{ $service->is_active ? 'badge-active' : 'badge-inactive' }}">
                        {{ $service->is_active ? 'Active' : 'Inactive' }}
                    </span>
                </td>
            </tr>
            @empty
            <tr>
                <td colspan="7" style="text-align: center; padding: 20px;">No services found</td>
            </tr>
            @endforelse
        </tbody>
    </table>

    @if($summary['by_category']->count() > 0)
    <div style="margin-top: 30px;">
        <h2 style="color: #3B82F6; font-size: 16px; border-bottom: 2px solid #3B82F6; padding-bottom: 5px;">Services by Category</h2>
        <table style="margin-top: 10px;">
            <thead>
                <tr>
                    <th>Category</th>
                    <th>Count</th>
                </tr>
            </thead>
            <tbody>
                @foreach($summary['by_category'] as $category => $count)
                <tr>
                    <td class="category">{{ ucfirst($category) }}</td>
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


