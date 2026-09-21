# Pickleball Reservation System Guide

## First-time setup

1. Create the first account on **Create an account**. New accounts are customers by default.
2. In Supabase, promote the first trusted operator with:

   ```sql
   update public.profiles set role = 'admin' where id = '<user-id>';
   ```

3. The administrator signs in through the same **Sign in** page and is sent to `/admin` automatically.
4. On **Admin center → People**, an administrator can change a registered account to **Staff** or **Admin**. Staff and admins also use the same sign-in page.

## Customer guide

1. Create an account using a name, email address, and password.
2. Open the verification email. Its link signs the customer in and opens **My bookings**. In Supabase Auth settings, add `https://YOUR-DOMAIN/auth/confirm` to the allowed redirect URLs (add the matching localhost URL for local testing).
3. Choose a date, then select an active court.
4. Enter a start time and duration. A time marked **BOOKED** cannot be selected. Change the duration if a previously available start time becomes unavailable.
5. Signed-in customers can proceed without re-entering their name or phone number. Guests must enter both.
6. Continue to payment, submit the payment information, and wait for staff to verify it. The booking appears in **My bookings**.
7. Use **Log out** beside **My bookings** on the customer booking page when finished.

## Staff and administrator guide

1. Sign in at `/login`. Staff and administrators open the Admin Center automatically.
2. **Confirmed sales** (administrator only) shows daily, monthly, and yearly sales. Sales include confirmed (paid) reservations only.
3. **Courts in use** lists every court and, for an active confirmed reservation, displays the customer name and booked time.
4. **Today's court schedule** shows today's live holds and confirmed reservations with their customer/guest name, time, status, and amount.
5. Use **Payments** to review payment submissions and confirm or reject them.
6. Use **Reservations**, **Availability**, and **Courts** to monitor bookings, free times, and court status.
7. Administrators alone can use **Customer accounts** and **Staff / admin accounts** to assign Customer, Staff, or Admin roles. Do not give administrator access to ordinary customer accounts.

## Notes

- A pending payment holds the selected slot for 15 minutes. After that deadline, the reservation expires, any pending payment is automatically rejected, and the court becomes bookable again.
- The database rejects overlapping live reservations, including simultaneous booking attempts.
- Disabled or maintenance courts cannot be booked.
