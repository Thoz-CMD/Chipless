# Chipless

Mobile-first poker room web app for creating rooms, joining by passcode, seating players, running a Chipless house-rule betting flow, and tracking hand settlements with Firebase Realtime Database.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript strict mode
- Tailwind CSS 4
- Firebase Authentication with Anonymous sign-in
- Firebase Realtime Database
- React Hook Form and Zod
- shadcn/ui-style primitives
- Lucide React

## Setup

Install dependencies:

```bash
npm install
```

Create local environment variables:

```bash
copy .env.example .env.local
```

Fill `.env.local` with the Firebase Web App config:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_DATABASE_URL=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

Firebase Console requirements:

- Enable Authentication > Anonymous sign-in.
- Create a Realtime Database.
- Do not use public test rules in production.
- Confirm `NEXT_PUBLIC_FIREBASE_DATABASE_URL` matches the Realtime Database URL.

## Scripts

```bash
npm run dev
npm run lint
npm run typecheck
npm run build
npm run start
```

## Firebase Rules

Realtime Database rules live in `database.rules.json`, and `firebase.json` points Firebase CLI to that file.

Deploy rules manually:

```bash
firebase deploy --only database
```

Do not deploy rules until you have confirmed `.firebaserc` points to the intended Firebase project.

## Deployment Checklist

Before app deployment:

```bash
npm run lint
npm run typecheck
npm run build
```

Then configure the same `NEXT_PUBLIC_FIREBASE_*` variables in your hosting provider.

This repo currently includes only Realtime Database Firebase CLI config. It does not configure Firebase Hosting for the Next.js app.

## Source Structure

```text
src/
  app/
    create-room/
    join-room/
    room/
  components/
    ui/
  features/
    auth/
    game/
      logic/
    rooms/
      services/
  lib/
    crypto/
    firebase/
    validations/
```

## Database Shape

Room creation writes:

```text
rooms/{roomId}
  id
  name
  hostUid
  status
  settings
    bigBlind
  gameState
  createdAt
  updatedAt

roomPlayers/{roomId}/{uid}
  uid
  displayName
  role
  joinedAt
  online
  seatIndex

roomSecrets/{roomId}
  hostUid
  passcodeHash
```

`roomSecrets.passcodeHash` stores a Web Crypto SHA-256 hash, not a plain passcode.
