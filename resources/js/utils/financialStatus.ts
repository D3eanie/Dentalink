export type ComputedPaymentStatus = 'pending' | 'partial' | 'paid' | 'overdue' | 'partially_paid' | 'partial_complete';

type StatusSource = {
    amount?: number | string | null;
    balance?: number | string | null;
    due_date?: string | null;
    is_partial_payment?: boolean;
    description?: string;
};

export const computePaymentStatus = (record: StatusSource): ComputedPaymentStatus => {
    const amount = Number(record.amount ?? 0);
    const balance = Number(record.balance ?? 0);

    // Check if this is a partial payment record or follow-up payment
    const isPartialPayment = record.is_partial_payment ||
                            (record.description && record.description.includes('Partial payment for'));
    const isFollowUpPayment = record.description && record.description.includes('Follow-up payment for');

    // Handle partial payment statuses
    if (isPartialPayment || isFollowUpPayment) {
        if (balance > 0) {
            // Balance remains - show as "partially paid"
            return 'partially_paid';
        } else if (balance === 0 && amount > 0) {
            // Balance cleared - show as "partial complete"
            return 'partial_complete';
        }
    }

    // Regular payment status logic
    if (balance > 0) {
        if (record.due_date) {
            const dueDate = new Date(record.due_date);
            const today = new Date();
            if (!isNaN(dueDate.getTime()) && dueDate < today) {
                return 'overdue';
            }
        }
        return amount > 0 ? 'partial' : 'pending';
    }

    return 'paid';
};
