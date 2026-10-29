import { SITE } from '@shared/config';
import { Markdown } from '@/components/Markdown';

const PRIVACY = `
_Last updated: October 2026. Written to follow Zimbabwe’s Cyber and Data Protection Act [Chapter 12:07] and Statutory Instrument 155 of 2024 — have it reviewed by a legal practitioner before relying on it._

## Who we are
${SITE.name} is the data controller for your account. Contact: ${SITE.contact.email} · ${SITE.contact.address}.

## What we collect
- **Account details:** your name, email, password (stored only as a salted hash — we can never see it), and optional town, school and bio.
- **Learning data:** lessons completed, exercise and challenge results, exam scores, XP and streaks, and code you choose to save.
- **Class data:** if you join a class, your teacher can see your name, email, progress and submissions for that class.
- **Security data:** when and from which browser you signed in, so you can see and sign out your devices, and a log of security events (for example a failed sign-in).
- **Payments:** handled by Paynow Zimbabwe. We store the plan, amount, status and reference — never your card number or PIN.

## Why we use it
To run your account and save your progress (our contract with you), issue and verify certificates, let your teachers support you, keep the service safe from abuse (our legitimate interest — for example rate limits and bot checks), and meet legal duties such as keeping payment records.

## Who helps us
We use a few trusted processors, each only for its job: **Cloudflare** (hosting, database, security), **OpenAI** (AI hints, tutor and pre-marking — only the code and question you send), **Brevo** (account emails), **Paynow** (payments). When you choose a password, we check it against known data breaches by sending only the first 5 characters of a one-way hash to Have I Been Pwned — never the password itself. Some processors are outside Zimbabwe; we only use providers with strong security commitments.

## Children
Kids Zone games work without an account. To create an account, learners under 18 need a parent’s or guardian’s agreement, which they confirm at sign-up. Parents can contact us at any time to see, correct or delete their child’s data.

## Your rights
- **See and take your data:** Settings → Your data → *Download my data* gives you everything as one file.
- **Correct it:** edit your profile in Settings, or ask us.
- **Delete it:** Settings → Your data → *Delete my account* erases your profile and learning history straight away. Payment records are kept, without your name, for as long as tax law requires.
- **Object or complain:** write to us first; you may also complain to the Data Protection Authority (POTRAZ).

## How long we keep it
While your account is open. Deleted accounts are erased at once; backup history rolls over within 30 days. Payment records are kept for as long as tax law requires.

## Security
Passwords are hashed (PBKDF2) and checked against known breaches; you can turn on two-step login with an authenticator app (admins must); sessions use secure, HttpOnly cookies; code you run stays in a sandbox in your own browser; and all traffic is encrypted. If a breach ever affects your data, we will tell you and the regulator promptly.
`;

const TERMS = `
_Last updated: October 2026. This is a starting template — have it reviewed by a legal practitioner before launch._

## Using the Academy
Be respectful in classes and discussions. Don’t share your account, attempt to break the platform, or submit someone else’s work as your own.

## Code and content
Code you write is yours. Lesson content is © ${SITE.name} and may be used for personal learning and classroom teaching.

## AI features
AI hints, tutoring and pre-marking can be wrong. Treat them as guidance; your teacher’s grade is final.

## Plans and payments
Paid plans run for the period you buy (monthly or yearly) and do not renew automatically. Contact us within 7 days if you were charged in error.

## Certificates
Certificates confirm that you passed an online exam on the Academy. We may revoke a certificate obtained dishonestly.

## Changes
We may update these terms; we’ll announce significant changes on the site.
`;

export default function Legal({ kind }: { kind: 'privacy' | 'terms' }) {
  return (
    <div className="container max-w-3xl py-12">
      <h1 className="mb-6 text-4xl font-bold">{kind === 'privacy' ? 'Privacy policy' : 'Terms of use'}</h1>
      <Markdown>{kind === 'privacy' ? PRIVACY : TERMS}</Markdown>
    </div>
  );
}
