// api/_lib/membershipExpiry.js
//
// Underscore-prefixed — not a route, doesn't count against the 12-function cap.
//
// Membership no longer runs 365 days from the purchase date — it always
// ends on the Indian financial year boundary (31 March), regardless of
// when during the year someone actually purchased. Someone buying in
// February gets a shorter first term than someone buying in April; that's
// the deliberate policy, not a bug.
//
// This logic already existed, correctly, in one single call site inside
// verify-payment.js's main flow — but never made it to the webhook or the
// reconciler's auto-heal path, which were both still doing the old
// 365-day calculation. Extracting it here so every path uses the same
// function instead of three different, silently inconsistent copies.

/**
 * Given a purchase date (defaults to now), returns the ISO date string
 * (YYYY-MM-DD) of the financial year end that purchase falls into.
 */
export function getMembershipExpiry(purchaseDate) {
  const now = purchaseDate ? new Date(purchaseDate) : new Date();
  const year = now.getFullYear();
  const march31 = new Date(year, 2, 31); // month 2 = March
  return (now > march31)
    ? new Date(year + 1, 2, 31).toISOString().split('T')[0]
    : march31.toISOString().split('T')[0];
}