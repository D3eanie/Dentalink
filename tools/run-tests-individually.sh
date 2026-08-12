#!/bin/bash

# Script to run tests one file at a time

cd /opt/lampp/htdocs/dashboard/dentalink

test_files=(
    "tests/Feature/PatientDoctorControllerTest.php"
    "tests/Feature/AppointmentControllerTest.php"
    "tests/Feature/ServiceControllerTest.php"
    "tests/Feature/PatientControllerTest.php"
    "tests/Feature/ScheduleControllerTest.php"
    "tests/Feature/DashboardControllerTest.php"
    "tests/Feature/Auth/AuthenticationTest.php"
    "tests/Feature/Auth/EmailVerificationTest.php"
    "tests/Feature/Auth/PasswordConfirmationTest.php"
    "tests/Feature/Auth/PasswordResetTest.php"
    "tests/Feature/Auth/RegistrationTest.php"
    "tests/Feature/Settings/PasswordUpdateTest.php"
    "tests/Feature/Settings/ProfileUpdateTest.php"
    "tests/Feature/DashboardTest.php"
    "tests/Feature/ExampleTest.php"
)

echo "Running tests one file at a time..."
echo "=================================="
echo ""

for test_file in "${test_files[@]}"; do
    if [ -f "$test_file" ]; then
        echo "=========================================="
        echo "Running: $test_file"
        echo "=========================================="
        php artisan test "$test_file" --stop-on-failure
        echo ""
        echo "Press Enter to continue to next test file..."
        read
    else
        echo "File not found: $test_file"
    fi
done

echo "All tests completed!"

