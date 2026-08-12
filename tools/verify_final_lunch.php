<?php
/**
 * Test the refined lunch break logic
 * Verifies that:
 * 1. Pre-lunch slots are offered correctly
 * 2. Lunch hour slots (12:00-12:59) are skipped
 * 3. POST-LUNCH slots (13:00+) are offered
 */

use Carbon\Carbon;

require __DIR__ . '/vendor/autoload.php';

echo "====== LUNCH BREAK LOGIC VERIFICATION ======\n\n";

// Test cases: start time, duration, should be offered?
$testCases = [
    // Pre-lunch (should be offered if ends before 12:00)
    ['start' => '08:00', 'duration' => 30, 'expect' => true, 'desc' => 'Early morning'],
    ['start' => '11:00', 'duration' => 30, 'expect' => true, 'desc' => '11:00 + 30min = 11:30 (before lunch)'],
    ['start' => '11:15', 'duration' => 30, 'expect' => true, 'desc' => '11:15 + 30min = 11:45 (before lunch)'],

    // Lunch boundary (should be skipped)
    ['start' => '11:30', 'duration' => 30, 'expect' => false, 'desc' => '11:30 + 30min = 12:00 (touches lunch)'],
    ['start' => '11:15', 'duration' => 60, 'expect' => false, 'desc' => '11:15 + 60min = 12:15 (extends into lunch)'],
    ['start' => '11:45', 'duration' => 30, 'expect' => false, 'desc' => '11:45 + 30min = 12:15 (extends into lunch)'],

    // During lunch (should be skipped)
    ['start' => '12:00', 'duration' => 30, 'expect' => false, 'desc' => '12:00 (during lunch)'],
    ['start' => '12:15', 'duration' => 30, 'expect' => false, 'desc' => '12:15 (during lunch)'],
    ['start' => '12:45', 'duration' => 30, 'expect' => false, 'desc' => '12:45 (during lunch)'],

    // After lunch (should ALL be offered)
    ['start' => '13:00', 'duration' => 30, 'expect' => true, 'desc' => '13:00 (1:00 PM - after lunch)'],
    ['start' => '13:00', 'duration' => 60, 'expect' => true, 'desc' => '13:00 + 60min (after lunch)'],
    ['start' => '13:15', 'duration' => 30, 'expect' => true, 'desc' => '13:15 (after lunch)'],
    ['start' => '14:00', 'duration' => 60, 'expect' => true, 'desc' => '14:00 (afternoon)'],
];

echo "Slot Time | Duration | Expected | Actual | Status\n";
echo "───────────────────────────────────────────────────────\n";

$allPass = true;

foreach ($testCases as $test) {
    $start = Carbon::createFromFormat('H:i', $test['start']);
    $duration = $test['duration'];
    $expectOffered = $test['expect'];

    $slotStartHour = (int) $start->format('H');
    $slotEndTime = $start->copy()->addMinutes($duration);
    $lunchStart = $start->copy()->setHour(12)->setMinute(0)->setSecond(0);

    // Apply the logic
    $shouldSkip = ($slotStartHour === 12) ||
                  ($slotStartHour < 12 && $slotEndTime->greaterThanOrEqualTo($lunchStart));

    $actualOffered = !$shouldSkip;
    $passes = ($actualOffered === $expectOffered);

    $status = $passes ? '✅' : '❌';
    if (!$passes) $allPass = false;

    printf(
        "%s | %3d min | %s   | %s | %s\n",
        $test['start'],
        $duration,
        $expectOffered ? 'OFFER' : 'SKIP ',
        $actualOffered ? 'OFFER' : 'SKIP ',
        $status
    );

    if (!$passes) {
        echo "         └─ {$test['desc']}\n";
        echo "         └─ Ends at: {$slotEndTime->format('H:i')}\n";
    }
}

echo "───────────────────────────────────────────────────────\n\n";

if ($allPass) {
    echo "✅ ALL TESTS PASS!\n\n";
    echo "Summary:\n";
    echo "  ✅ Pre-lunch slots offered (if they don't extend into lunch)\n";
    echo "  ❌ Lunch hour slots skipped (12:00-12:59)\n";
    echo "  ❌ Overlapping slots skipped (ending at/after 12:00)\n";
    echo "  ✅ Post-lunch slots offered (13:00 onwards)\n";
} else {
    echo "❌ SOME TESTS FAILED\n";
}
