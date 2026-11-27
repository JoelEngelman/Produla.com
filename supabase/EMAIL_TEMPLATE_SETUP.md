# Produla email confirmation setup

The React app now sends new signups to a branded confirmation state and uses this redirect after Supabase verifies the link:

`https://joelengelman.github.io/Produla.com/?email_confirmed=1`

If the production site moves to a custom domain, update the redirect URL in `src/App.jsx` configuration and the Supabase allow-list accordingly.

## 1. Configure the redirect allow-list

In Supabase, open **Authentication → URL Configuration**.

- Set **Site URL** to `https://joelengelman.github.io/Produla.com/`.
- Add `https://joelengelman.github.io/Produla.com/**` to **Redirect URLs**.
- For local development, add `http://localhost:5173/**`.

The app uses Vite's `BASE_URL`, so the callback respects the GitHub Pages sub-path when that deployment is built with `VITE_BASE_PATH=/Produla.com/`.

## 2. Install the branded confirmation email

In Supabase, open **Authentication → Email Templates → Confirm signup**.

- Subject: `Welcome to Produla — confirm your email`
- Replace the template body with the complete contents of [confirmation.html](./confirmation.html).
- Keep the `{{ .ConfirmationURL }}` variable intact in both links.

Save the template. Supabase sends this template for signup confirmation; the app cannot change the hosted email template through a GitHub commit.

## 3. Test the full flow

1. Sign up using an email address you can access.
2. Confirm the email uses the Produla branding.
3. Click **Verify my email address**.
4. Confirm the browser returns to Produla and shows **You're all set**.
5. Test **Resend confirmation email** from the pending state.
6. Test an expired/used link; Produla should show the refresh state and let the user request another email.

Keep **Confirm email** enabled in Supabase Auth. Guest/anonymous signup remains separate and does not require email confirmation.
