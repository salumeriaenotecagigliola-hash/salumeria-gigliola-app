# Security Specification - Enoteca Digital

## Data Invariants
1. A product must have a positive price.
2. An order must have at least one item.
3. Order item prices must match the product price at the time of order (snapshot).
4. Status transitions must be logical (e.g., from pending to preparing).
5. Table numbers must be strings.

## The "Dirty Dozen" Payloads
1. **Unauthorized Product Create**: Trying to create a product as an unauthenticated user.
2. **Unauthorized Product Update**: Trying to change price as a customer.
3. **Ghost Order Field**: Adding `isPaid: true` to a pending order by customer.
4. **Price Spoofing**: Submitting an order with item prices lower than menu prices (logic must check values if possible, or at least structure).
5. **Giant ID**: Using a 2MB string as a table number.
6. **Negative Quantity**: Ordering -5 glasses of wine.
7. **Malformed Category**: Injecting script into a product category.
8. **Status Shortcut**: Moving order from `pending` directly to `paid` without `served`.
9. **Deletion Theft**: Deleting someone else's order.
10. **Listing PII**: Accessing a hypothetical user collection (not implemented yet, but for future proofing).
11. **Spoofed Auth**: Trying to update an order with a different table number than the one used for creation (if tracked).
12. **System Field Update**: Overwriting `createdAt` with a client-side timestamp.

## The Test Runner
(Skeleton for firestore.rules.test.ts)
- Test: Prevent unauthorized product writes.
- Test: Prevent negative quantities in orders.
- Test: Enforce server-side timestamps.
- Test: Allow customers to create orders but not update sensitive fields after they are 'served'.
