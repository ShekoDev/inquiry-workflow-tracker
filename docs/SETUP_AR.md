# PIQCS — نظام إدارة ومتابعة الاستفسارات وعروض الأسعار
**Inquiry & Quotation Control System** — الإصدار 1.0

> جميع حقوق الملكية محفوظة لمحمود شهاب

---

## 1. الستاك

| الطبقة | التقنية |
|---|---|
| الواجهة | React 18 + TypeScript + Vite + Tailwind CSS |
| المصادقة | Firebase Authentication (إيميل + كلمة مرور) |
| قاعدة البيانات | Cloud Firestore + Security Rules |
| الملفات | Firebase Storage |
| الخلفية (اختياري) | Cloud Functions v2 — تحتاج خطة Blaze |
| الاستضافة | Firebase Hosting |
| التقارير | Excel عبر SheetJS — PDF عبر طباعة المتصفح (تدعم العربية بالكامل) |

**النظام الأساسي يعمل كاملاً على الخطة المجانية (Spark)**. الـCloud Functions إضافة تحسّن الأمان والأتمتة (تسجيل من جهة السيرفر، تقرير نهاية اليوم المجدول، تنبيهات التأخير، الحذف النهائي لحسابات الدخول) وتُفعَّل لاحقاً عند الاشتراك في Blaze من غير أي تعديل في الكود.

---

## 2. التشغيل لأول مرة — خطوة بخطوة

### أ) إنشاء مشروع Firebase
1. افتح https://console.firebase.google.com ← **Add project** ← اكتب اسم المشروع (مثلاً `piqcs`).
2. من القائمة الجانبية:
   - **Authentication** ← Get started ← **Sign-in method** ← فعّل **Email/Password**.
   - **Firestore Database** ← Create database ← اختر **Production mode** ← اختر أقرب منطقة (مثلاً `europe-west1` أو `me-central1`).
   - **Storage** ← Get started ← Production mode.
3. **Project settings** (الترس) ← **Your apps** ← أيقونة الويب `</>` ← سجّل التطبيق ← انسخ قيم `firebaseConfig`.

### ب) إعداد المشروع محلياً
```bash
# داخل مجلد piqcs
npm install
copy .env.example .env      # على ويندوز — أو cp على ماك/لينكس
```
افتح `.env` واملأ القيم من الخطوة السابقة:
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=xxxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=xxxx
VITE_FIREBASE_STORAGE_BUCKET=xxxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### ج) نشر قواعد الأمان والفهارس (مرة واحدة)
```bash
npm install -g firebase-tools
firebase login
firebase use --add            # اختر مشروعك
firebase deploy --only firestore:rules,firestore:indexes,storage
```

### د) التشغيل
```bash
npm run dev
```
افتح الرابط الظاهر (عادةً http://localhost:5173). أول مرة هيحوّلك تلقائياً لشاشة **الإعداد الأولي** لإنشاء حساب **المدير الأعلى (Super Admin)**. بعدها سجّل الدخول به.

> حساب المدير الأعلى واحد فقط، لا يمكن حذفه أو تعطيله أو سحب صلاحياته، وهو الوحيد الذي يرى «سجل عمليات الحذف».

### هـ) النشر على الإنترنت
```bash
npm run build
firebase deploy --only hosting
```
الرابط: `https://<project-id>.web.app`

---

## 3. تفعيل Cloud Functions (اختياري — خطة Blaze)
```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```
بعد النشر النظام يستخدمها تلقائياً. ما تضيفه:
- `bootstrapSuperAdmin` / `createUser` / `deleteUser` — إنشاء وحذف المستخدمين من جهة السيرفر (حذف حساب الدخول نفسه).
- `syncUserPermissions` / `syncRolePermissions` — إعادة حساب الصلاحيات الفعلية لكل مستخدم عند تغيير دوره أو استثناءاته أو تعديل الدور نفسه.
- `auditInquiries` / `auditQuotations` / `auditUsers` — تسجيل التغييرات الحساسة في سجل النشاط من جهة السيرفر (لا يمكن تجاوزه من المتصفح).
- `eodReport` — تقرير نهاية اليوم 4:30 م (توقيت الرياض) — إشعار لكل مسوق بالمعلّق عنده وملخص للإدارة.
- `overdueSweep` — فحص كل ساعة للاستفسارات المتأخرة وإشعار المهندس والمديرين.
- `retentionSweep` — أرشفة سجل النشاط الأقدم من مدة الاحتفاظ المحددة في الإعدادات.

بدون Functions: إنشاء المستخدمين وإعادة الإسناد والحذف تتم من المتصفح بنفس المنطق، والحذف النهائي يعلّم الحساب `deleted` (ولحذف حساب الدخول نفسه: Firebase Console ← Authentication ← Delete user).

---

## 4. الأدوار الافتراضية
Super Admin · Admin · Branch Manager · Priority Engineer · Estimation Engineer · Salesperson · Management · Viewer

كلها قابلة للتعديل من **الإدارة ← الأدوار والصلاحيات** (مصفوفة صلاحيات كاملة)، ويمكن إنشاء أدوار جديدة. ولكل مستخدم على حدة شاشة **صلاحيات شخصية** تمنح أو تمنع أي صلاحية بعينها بغض النظر عن دوره.

الصلاحية الفعلية = صلاحيات الدور + الممنوح استثناءً − الممنوع استثناءً. محققة في الواجهة **وفي قواعد Firestore** معاً.

---

## 5. دورة حياة الاستفسار
```
NEW → FILE_REVIEW → PRIORITY_ASSIGNMENT → ASSIGNED → PROCESSING → COSTING → QUOTATION_PREP
    → UNDER_REVIEW → APPROVED → SENT_TO_SALES → SENT_TO_CLIENT → FOLLOW_UP → WON / LOST
```
حالات جانبية: `WAITING_INFO` (الساعة موقوفة) · `ON_HOLD` (الساعة موقوفة) · `REVISION_REQUIRED` · `CLIENT_REVISION` · `NO_BID` · `CANCELLED`

- الانتقالات محكومة بجدول في `src/constants/workflow.ts` (`TRANSITIONS`).
- الحالات الحساسة تتطلب ملاحظة إجبارية.
- كل التواريخ من ساعة السيرفر (`serverTimestamp`).
- الـSLA تُحسب بساعات العمل فقط (الإعدادات ← ساعات العمل والعطلات)، وفترات انتظار المعلومات لا تُحسب على المهندس ويُمدَّد الموعد بها تلقائياً.
- الأولوية المبدئية تُحسب تلقائياً (تاريخ التسليم + تصنيف العميل + القيمة) ويمكن تعديلها بسبب مسجّل.

---

## 6. هيكل المجلدات
```
src/
  config/firebase.ts        تهيئة Firebase
  constants/                الصلاحيات، الأدوار، سير العمل، الثيمات
  i18n/                     القاموس عربي/إنجليزي ومزوّد الترجمة
  contexts/                 المصادقة، الثيم، التنبيهات
  services/                 كل الكتابة على قاعدة البيانات + تسجيل النشاط
  hooks/                    اشتراكات Firestore الحية
  utils/                    SLA، التنسيق، التصدير
  components/               التخطيط، المكونات، الحراس
  pages/                    الشاشات
functions/src/index.ts      Cloud Functions
firestore.rules             قواعد الأمان
```

---

## 7. ملاحظات مهمة
- **لا تعدّل `effectivePermissions` يدوياً** في Firestore — تُحسب تلقائياً.
- **لا تحذف `system/bootstrap`** — حذفه يفتح شاشة الإعداد الأولي من جديد.
- سطر الحقوق موجود في: الشريط الجانبي، تذييل كل صفحة، شاشة الدخول، وكل تقرير PDF/Excel. القيمة في `src/constants/themes.ts` و`src/i18n/*.ts`.
- لتغيير اسم الشركة أو الشعار أو الألوان أو العملة أو الضريبة أو الحد الأدنى للهامش: **الإدارة ← الإعدادات** (بدون كود).
