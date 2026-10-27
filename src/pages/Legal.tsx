import { SITE } from '@shared/config';
import { Markdown } from '@/components/Markdown';

const PRIVACY = `
_Last updated: October 2026. This is a starting template — have it reviewed for compliance with Zimbabwe’s Cyber and Data Protection Act [Chapter 12:07] before launch._

## What we collect
- **Account details:** your name, email, password (stored only as a salted hash), and optional town, school and bio.
- **Learning data:** lessons completed, exercise and challenge results, exam scores, XP and streaks.
- **Class data:** if you join a class, your teacher can see your name, email, progress and submissions for that class.
- **Code you send to the AI coach or tutor:** used only to answer you. It is sent to our AI provider (OpenAI) for processing and not used by us for advertising.
- **Payments:** handled by Paynow Zimbabwe. We store the plan, amount, status and reference — never your card or PIN.

## How we use it
To run your account, save your progress, issue certificates, let teachers support you, prevent abuse (for example rate limits), and improve lessons.

## Children
Learners under 13 should use the Academy with a parent, guardian or teacher. Kids Zone games work without an account.

## Your choices
You can update your profile at any time in Settings, and ask us to export or delete your account by contacting ${SITE.contact.email}.

## Security
Passwords are hashed with PBKDF2, sessions use secure HttpOnly cookies, and data is stored on Cloudflare’s infrastructure.

## Contact
${SITE.contact.email} · ${SITE.contact.address}
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
