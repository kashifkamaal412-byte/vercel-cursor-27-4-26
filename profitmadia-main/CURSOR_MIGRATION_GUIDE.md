# 🚀 Cursor AI Migration Guide — آسان اردو/English گائیڈ

## آپ کا Supabase پروجیکٹ
- **URL:** `https://ognlzlciuhzeemifvrts.supabase.co`
- **Project ID:** `ognlzlciuhzeemifvrts`
- **Anon Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nbmx6bGNpdWh6ZWVtaWZ2cnRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MDEzMzMsImV4cCI6MjA4ODM3NzMzM30._t0gVF5AyClnLkTNZ8XF_mIUUGxFXTdAhW7OxYm89js`

---

## ✅ صرف 6 آسان قدم — کوڈنگ کی ضرورت نہیں!

### قدم 1: GitHub سے ڈاؤن لوڈ کرو
1. GitHub ریپو کھولو
2. **Code** > **Download ZIP** کلک کرو
3. ZIP فائل extract کرو
4. Cursor میں فولڈر کھولو

### قدم 2: `.env` فائل بناؤ
پروجیکٹ کے root فولڈر میں `.env` نام سے فائل بناؤ اور یہ paste کرو:
```
VITE_SUPABASE_URL=https://ognlzlciuhzeemifvrts.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nbmx6bGNpdWh6ZWVtaWZ2cnRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MDEzMzMsImV4cCI6MjA4ODM3NzMzM30._t0gVF5AyClnLkTNZ8XF_mIUUGxFXTdAhW7OxYm89js
VITE_SUPABASE_PROJECT_ID=ognlzlciuhzeemifvrts
```

### قدم 3: Supabase Database Setup
1. **https://supabase.com/dashboard** کھولو
2. اپنا پروجیکٹ (`ognlzlciuhzeemifvrts`) کلک کرو
3. بائیں طرف **SQL Editor** کلک کرو
4. **New Query** کلک کرو
5. فائلوں کو اس ترتیب سے ایک ایک کر کے paste اور **Run** کرو:
   - `supabase-setup/001_complete_schema.sql` — تمام ٹیبلز
   - `supabase-setup/002_rls_policies.sql` — سیکیورٹی پالیسیز
   - `supabase-setup/003_functions_triggers.sql` — فنکشنز اور ٹریگرز
   - `supabase-setup/004_storage_buckets.sql` — سٹوریج بکٹس

⚠️ **ہر فائل الگ سے Run کرو** — سب ایک ساتھ paste نہ کرو!

### قدم 4: `src/integrations/supabase/client.ts` اپڈیٹ کرو
Cursor میں یہ فائل کھولو اور اس کوڈ سے replace کرو:
```typescript
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error(
    '❌ Missing Supabase environment variables!\\n' +
    'Create a .env file in project root with:\\n' +
    'VITE_SUPABASE_URL=https://ognlzlciuhzeemifvrts.supabase.co\\n' +
    'VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
```

### قدم 5: Lovable Cloud Auth ہٹاؤ
- فائل `src/integrations/lovable/index.ts` کو **Delete** کرو
- `src/contexts/AuthContext.tsx` میں `signInWithGoogle` فنکشن پہلے سے Supabase direct استعمال کر رہا ہے — کوئی تبدیلی کی ضرورت نہیں

### قدم 6: چلاؤ!
Cursor Terminal میں:
```bash
npm install
npm run dev
```

ایپ `http://localhost:8080` پر کھل جائے گی ✅

---

## 🔑 Edge Functions (اختیاری)

اگر آپ لائیو اسٹریمنگ استعمال کرنا چاہتے ہیں تو Supabase Dashboard میں:
1. **Edge Functions** سیکشن کھولو
2. `supabase/functions/` فولڈر سے فنکشنز deploy کرو
3. **Settings > Secrets** میں یہ secrets ایڈ کرو:
   - `ZEGO_APP_ID`
   - `ZEGO_APP_SIGN`
   - `ZEGO_SERVER_SECRET`
   - `SHOTSTACK_API_KEY` (اختیاری - ویڈیو رینڈرنگ کے لیے)

---

## ⚠️ اہم نوٹس

1. **Lovable Cloud آٹو جنریٹڈ فائلیں:**
   - `src/integrations/supabase/types.ts` — Cursor میں آپ `supabase gen types` سے نئی بنا سکتے ہیں
   - `src/integrations/lovable/index.ts` — Delete کر دیں

2. **Google Sign-In:**
   - Supabase Dashboard > Authentication > Providers > Google
   - Google Cloud Console سے Client ID اور Secret ایڈ کریں

3. **Email Confirmation:**
   - Dashboard > Authentication > Settings
   - "Confirm email" آن/آف کریں اپنی ضرورت کے مطابق

---

## 🎯 خلاصہ

| قدم | کیا کرنا ہے | وقت |
|------|-------------|------|
| 1 | GitHub سے ڈاؤن لوڈ | 1 منٹ |
| 2 | `.env` فائل بناؤ | 1 منٹ |
| 3 | SQL scripts چلاؤ | 5 منٹ |
| 4 | client.ts اپڈیٹ | 1 منٹ |
| 5 | Lovable فائل ڈیلیٹ | 1 منٹ |
| 6 | `npm install && npm run dev` | 2 منٹ |

**کل وقت: ~10 منٹ** ⏱️

بس! آپ کی ایپ آپ کے اپنے Supabase پر مکمل طور پر چلے گی! 🎉
