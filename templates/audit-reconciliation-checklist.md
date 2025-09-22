# Customer Management Audit & Reconciliation Checklist

## Daily Tasks (End of Business Day)

### 1. Transaction Reconciliation
- [ ] Verify all sales transactions are recorded with correct bill numbers
- [ ] Check that all payments received are properly recorded
- [ ] Confirm buyback transactions have correct original prices and 60% rate applied
- [ ] Validate that empty returns don't affect ledger balance
- [ ] Ensure all transactions have proper timestamps and user attribution

### 2. Inventory Reconciliation
- [ ] Verify stock quantities match physical inventory
- [ ] Check that sales properly reduced stock quantities
- [ ] Confirm returns added to appropriate stock (filled/empty/partial)
- [ ] Validate partial cylinders have correct remaining_kg recorded
- [ ] Check low stock alerts and reorder points

### 3. Customer Ledger Verification
- [ ] Reconcile customer ledger balances using formula:
  ```
  Ledger Balance = Total Sales - Total Payments - Total Buybacks + Adjustments
  ```
- [ ] Verify no negative ledger balances without proper authorization
- [ ] Check that credit limits are not exceeded
- [ ] Confirm payment terms are being followed

## Weekly Tasks (Every Friday)

### 1. AR Aging Analysis
- [ ] Run AR Aging report and review 0-30, 31-60, 61-90, >90 day buckets
- [ ] Identify customers with outstanding balances over 30 days
- [ ] Review payment terms vs actual payment dates
- [ ] Flag customers requiring follow-up calls

### 2. Buyback Reconciliation
- [ ] Verify all buybacks used correct original sold prices
- [ ] Check that 60% buyback rate was applied consistently
- [ ] Confirm partial cylinder returns have proper remaining_kg recorded
- [ ] Validate buyback settlements (ledger vs cash)

### 3. Cylinder Due Tracking
- [ ] Reconcile cylinder due counts with physical tracking
- [ ] Verify deliveries increased cylinder due counts
- [ ] Confirm returns decreased cylinder due counts
- [ ] Check for any discrepancies in cylinder due tracking

### 4. System Integrity Checks
- [ ] Verify no voided transactions without proper authorization
- [ ] Check that all bill numbers are unique and sequential
- [ ] Confirm user permissions are correctly assigned
- [ ] Validate that all transactions have proper audit trails

## Monthly Tasks (End of Month)

### 1. Comprehensive Reconciliation
- [ ] Full customer ledger reconciliation for all active customers
- [ ] Complete inventory reconciliation with physical count
- [ ] Verify all financial transactions are properly categorized
- [ ] Check for any orphaned or incomplete transactions

### 2. Financial Reporting
- [ ] Generate monthly AR summary report
- [ ] Create cylinder due summary report
- [ ] Prepare buyback analysis report
- [ ] Compile daily cashbook summaries

### 3. Data Integrity Audit
- [ ] Verify all customer information is complete and accurate
- [ ] Check for duplicate customers or phone numbers
- [ ] Validate product pricing consistency
- [ ] Confirm all required fields are populated

### 4. System Maintenance
- [ ] Review and update low stock thresholds
- [ ] Check system settings and configurations
- [ ] Verify backup procedures are working
- [ ] Update user access permissions as needed

## Quarterly Tasks

### 1. Customer Credit Review
- [ ] Review and update customer credit limits
- [ ] Analyze payment history and update payment terms
- [ ] Identify customers for credit limit increases/decreases
- [ ] Review customer risk profiles

### 2. Pricing Analysis
- [ ] Review buyback rates and pricing policies
- [ ] Analyze competitor pricing
- [ ] Update product pricing as needed
- [ ] Review discount policies and terms

### 3. Process Improvement
- [ ] Review transaction processing efficiency
- [ ] Identify bottlenecks in the workflow
- [ ] Update procedures based on lessons learned
- [ ] Train staff on any new procedures

## Exception Handling

### High Outstanding Balances
- [ ] Flag customers with balances > 100,000 PKR
- [ ] Contact customers with overdue payments
- [ ] Review payment terms for high-risk customers
- [ ] Consider credit limit adjustments

### Inventory Discrepancies
- [ ] Investigate any stock quantity mismatches
- [ ] Check for missing or duplicate transactions
- [ ] Verify physical inventory counts
- [ ] Document and resolve discrepancies

### System Errors
- [ ] Log all system errors and exceptions
- [ ] Report critical issues to IT support
- [ ] Document resolution steps
- [ ] Update procedures to prevent recurrence

## Sign-off

**Daily Reconciliation Completed By:** _________________ Date: _________

**Weekly Review Completed By:** _________________ Date: _________

**Monthly Audit Completed By:** _________________ Date: _________

**Supervisor Approval:** _________________ Date: _________

---

*This checklist should be completed and filed for audit purposes. All exceptions should be documented with resolution steps.*