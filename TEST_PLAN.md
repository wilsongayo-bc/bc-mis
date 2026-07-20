# System Acceptance Test (SAT) & User Acceptance Test (UAT) Plan

This document outlines the test scenarios to validate the end-to-end functionality of the Coldea MIS, specifically focusing on the newly implemented Payment and Enrollment workflows.

## 🎯 Objectives
- Verify that the Payment Processing module works correctly across all methods (Cash, Card, Transfer, Check).
- Ensure financial data is accurately reflected in Student Records and Reports.
- Validate that the Bank Management settings integrate correctly with payment forms.
- Confirm that role-based access control (RBAC) is enforced for Finance, Admin, and Students.

---

## 🧪 Phase 1: System Acceptance Testing (SAT)
*Technical verification of system components and logic.*

### 1. Bank Management (Admin)
- [ ] **Create Bank**: Add a new bank (e.g., "Metrobank") with a code. Verify it appears in the list.
- [ ] **Edit Bank**: Change the bank name. Verify the update persists.
- [ ] **Delete/Deactivate Bank**: Delete a bank. Verify it is removed from the active list but data integrity is maintained.
- [ ] **Duplicate Check**: Try adding a bank with an existing name. Verify error handling.

### 2. Payment Processing (Finance/Admin)
#### A. New Payment Creation
- [ ] **Cash Payment**: Create a payment for a student. Verify status is `PENDING` (or `PAID` if immediate).
- [ ] **Validation**: Try creating a payment with negative amount or missing student. Verify validation errors.

#### B. Processing Payments (The "Process" Action)
- [ ] **Card Payment**: 
  - Select "Card".
  - Verify "Card Type" dropdown appears (Visa/Mastercard).
  - Enter Transaction ID.
  - Submit and verify status becomes `PAID` and remarks include "Paid via VISA/Mastercard".
- [ ] **Bank Transfer**:
  - Select "Bank Transfer".
  - Verify "Bank Name" dropdown appears (populated from Settings).
  - Select a bank and enter Reference No.
  - Submit and verify remarks include "Bank: [Name]".
- [ ] **Check Payment**:
  - Select "Check".
  - Verify "Bank Name" dropdown and "Check Number" field appear.
  - Submit and verify remarks include Bank Name and Check Number.

#### C. Refunds & Cancellations
- [ ] **Refund**: Refund a `PAID` payment. Verify status `REFUNDED` and remarks are required.
- [ ] **Cancel**: Cancel a `PENDING` payment. Verify status `CANCELLED`.

### 3. Student Portal (Student)
- [ ] **My Payments**: Login as a student. Check `/my-payments`.
- [ ] **History Verification**: Verify that the payments made by Admin/Finance appear in the student's history.
- [ ] **Balance Check**: Verify the total paid and remaining balance calculations are correct.

### 4. Reports (Admin/Finance)
- [ ] **Daily Collection**: 
  - Generate report for "Today". 
  - Verify the total matches the sum of payments processed above.
  - Verify the breakdown table lists all transactions.
- [ ] **Payment Methods**:
  - Generate report.
  - Verify the breakdown by method (Cash vs Card vs Transfer) is accurate.
  - Verify the "Details" section correctly splits Card types (Visa/Mastercard) and Banks (BPI/BDO).

---

## 👥 Phase 2: User Acceptance Testing (UAT) Workflow
*End-to-end scenarios mimicking real-world usage.*

### Scenario A: The "New Enrollee" Flow
1. **Registrar**: Registers a new student "Juan Dela Cruz".
2. **Registrar**: Enrolls Juan in "BSCS - 1st Year".
3. **Finance**: 
   - Sees Juan's enrollment.
   - Accepts a **Cash** downpayment of ₱5,000.
   - Processes the payment.
4. **Student**: Juan logs in, sees ₱5,000 paid, and checks his remaining balance.
5. **Admin**: Checks **Daily Collection Report** and sees the ₱5,000 entry.

### Scenario B: The "Tuition Payment via Bank Transfer" Flow
1. **Student**: Uploads proof of payment (if feature exists) OR emails proof to Finance.
2. **Finance**: 
   - Locates student record.
   - Creates a new payment entry for ₱10,000.
   - Clicks "Process".
   - Selects **Bank Transfer** -> **BPI** -> Enters Ref # `TRX-12345`.
   - Saves.
3. **System**: Updates student balance.
4. **Finance**: Checks **Payment Method Report** and sees +₱10,000 under "Bank Transfer > BPI".

### Scenario C: The "Bounced Check" Flow
1. **Finance**: Accepts a **Check** payment of ₱15,000 from a parent.
   - Records it as **Check** -> **Metrobank** -> Check # `CHK-999`.
2. **Finance**: Marks it as `PAID` initially.
3. **Finance**: A week later, bank notifies check bounced.
4. **Finance**: 
   - Finds the payment.
   - Updates status to `CANCELLED` or `FAILED` (or Refunds if strict accounting).
   - Adds remark "Bounced Check - Insufficient Funds".
5. **System**: Student balance should increase back by ₱15,000.

---

## 🛑 Missing / Potential Gaps to Check
Based on this plan, we should verify if we are missing:
1. **Receipt Generation**: Can we print/download a receipt after processing?
2. **Proof of Payment Upload**: Can students upload a screenshot of their transfer?
3. **Partial Refunds**: Does the system support refunding only part of a payment?
4. **Email Notifications**: Does the student get an email when payment is confirmed?
5. **Audit Logs**: Do we have a history of *who* processed the payment and *when*?
