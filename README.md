# Chipless

Mobile-first poker room web app for creating rooms, joining by passcode, seating players, running a Chipless house-rule betting flow, and tracking hand settlements with Firebase Realtime Database.

## เกี่ยวกับแอพนี้

Chipless คือเว็บแอพสำหรับจัดห้องเล่นโป๊กเกอร์แบบส่วนตัวกับเพื่อน ครอบครัว หรือกลุ่มเล็กๆ โดยไม่ต้องมีระบบนับชิปแยกต่างหาก จุดหลักของแอพนี้คือช่วยจัดการห้อง จัดการผู้เล่น คุมลำดับเกม และติดตามการสรุปยอด เพื่อให้เจ้าของห้องดูแลเกมได้ง่ายขึ้น

โปรเจกต์นี้ออกแบบมาสำหรับเกมส่วนตัวและการเล่นตามกติกากลุ่ม ไม่ใช่แพลตฟอร์มพนัน และไม่ได้รองรับตรรกะการเดิมพันเงินจริง

## เป้าหมายของแอพ

- สร้างห้องส่วนตัวและเชิญผู้เล่นด้วยรหัสผ่านได้ง่าย
- ช่วยเจ้าของห้องจัดการที่นั่ง ชื่อผู้เล่น และสถานะห้องได้ในที่เดียว
- ทำให้เห็นความคืบหน้าของแต่ละมือและการสรุปยอดชัดเจน เพื่อปิดเกมได้เร็วขึ้น
- ใช้งานบนมือถือได้ดี เพื่อให้ผู้เล่นเข้าร่วมหรือเล่นจากโทรศัพท์ได้สะดวก

## วิธีใช้งาน

1. เจ้าของห้องสร้างห้องและตั้งค่ารายละเอียดห้อง
2. ผู้เล่นคนอื่นเข้าร่วมห้องด้วยรหัสผ่าน
3. ผู้เล่นเลือกชื่อและที่นั่งของตัวเอง
4. ดำเนินเกมผ่าน flow ของห้อง โดยบันทึกแอ็กชันและการสรุปยอดไว้ในแอพ
5. เจ้าของห้องจัดการการเปลี่ยนแปลงผู้เล่น อัปเดตสถานะห้อง และปิดห้องเมื่อจบเซสชัน

## สิ่งที่ทำได้

- สร้างและเข้าร่วมห้องส่วนตัว
- จัดการชื่อผู้เล่นและที่นั่ง
- ติดตามสถานะห้องระหว่างเล่น
- บันทึกแอ็กชันของเกมและการสรุปยอดของแต่ละมือ
- ดูสรุปห้องและข้อมูลแนว leaderboard
- จัดการการออนไลน์/ออฟไลน์ของผู้เล่น และเก็บกวาดห้องเมื่อมีคนออก

## สถานการณ์ที่เหมาะกับการใช้งาน

- เล่นโป๊กเกอร์ที่บ้านกับเพื่อน
- เกมแบบโต๊ะส่วนตัวสำหรับกลุ่มเล็ก
- เซสชันที่เล่นซ้ำบ่อยๆ และต้องการตั้งห้องให้เร็ว
- เกมของคลับหรือคอมมูนิตี้ที่ต้องการเครื่องมือจัดการห้องแบบง่ายๆ
- กรณีที่เป้าหมายคือจัดการโต๊ะเล่น ไม่ใช่เปิดระบบพนันสาธารณะ

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
