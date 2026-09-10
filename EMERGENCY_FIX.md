# 🚨 EMERGENCY FIX - ล้างข้อมูล Firebase

## ปัญหา:
มี onDisconnect handlers เก่า ๆ ที่ถูกสร้างซ้อนกันจากการ debug ก่อนหน้านี้
ทำให้เกิด PERMISSION_DENIED errors ซ้ำ ๆ ไม่หยุด

## วิธีแก้ (ทำตามลำดับ):

### 1. ล้างข้อมูลใน Firebase Realtime Database
- เข้า Firebase Console: https://console.firebase.google.com/
- เลือก Project ของคุณ
- ไปที่ Realtime Database
- ลบข้อมูลใน path `/rooms` และ `/roomPlayers` ทั้งหมด
  (หรือลบทั้ง database แล้วสร้างใหม่)

### 2. Restart Browser (สำคัญ!)
- ปิด Browser ทั้งหมด
- เปิดใหม่ (จะได้ clear onDisconnect handlers เก่า ๆ)

### 3. ลบ .next cache
```bash
rm -rf .next
npm run dev
```

### 4. ทดสอบใหม่
- สร้างห้องใหม่
- เข้าร่วมห้อง
- ดูว่า error ยังมีอยู่ไหม

## ทำไมต้องทำแบบนี้?
onDisconnect handlers ถูกสร้างที่ Firebase server-side
แม้เราจะแก้ code แล้ว handlers เก่าที่ถูกสร้างไว้ก่อนหน้ายังทำงานอยู่
การล้างข้อมูลและ restart browser จะช่วยให้เริ่มต้นใหม่อย่างสมบูรณ์
