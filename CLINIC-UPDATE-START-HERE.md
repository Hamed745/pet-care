# تحديث العيادات لمشروع PetCaree (نسخة Samar)

هذه الملفات دُمجت مع النسخة المرفوعة من `C:\Users\Samar\Desktop\PetCaree`، وليست Patch لنسخة GitHub مختلفة.

## التثبيت فوق مشروعك الحالي

1. احتفظ بالنسخة الاحتياطية `C:\Users\Samar\Desktop\PetCaree-Clinic-Backup.zip`، ولا تحذف مجلد المشروع الحالي.
2. ضع ملف `PetCaree-Clinic-Overlay.zip` على سطح المكتب. **فك محتوياته داخل مجلد PetCaree نفسه** (وليس في مجلد جديد)، مع السماح باستبدال الملفات المحددة.

   ```powershell
   Expand-Archive -Path "C:\Users\Samar\Desktop\PetCaree-Clinic-Overlay.zip" -DestinationPath "C:\Users\Samar\Desktop\PetCaree" -Force
   ```

3. افتح نافذة PowerShell جديدة، ونفذ:

   ```powershell
   cd "C:\Users\Samar\Desktop\PetCaree"
   npm.cmd install
   npm.cmd test
   npm.cmd run build
   npm.cmd run dev:maps:web -- --port 5190 --strictPort
   ```

4. افتح `http://localhost:5190/register` لاختيار نوع الحساب. التسجيل للعيادة أو المتجر ينشئ حساب Firebase ثم يوجّه إلى نموذج العمل المناسب. يمكن للحسابات الحالية إضافة دور من `/settings`.

## تشغيل خدمة الخلفية (مطلوب لحفظ الطلبات)

واجهة العيادات لا تعمل كاملةً بمجرد تشغيل Vite. الـ API الجديد موجود في:

`admin-backend/render-api/server.cjs` و `admin-backend/render-api/clinics.cjs`

لتشغيله محليًا، يجب توفير صلاحيات **Firebase Admin** الرسمية للمشروع عبر `FIREBASE_SERVICE_ACCOUNT_JSON` أو `GOOGLE_APPLICATION_CREDENTIALS`، ثم تنفيذ الأوامر التالية في PowerShell منفصل:

```powershell
cd "C:\Users\Samar\Desktop\PetCaree\admin-backend\render-api"
npm.cmd install
npm.cmd start
```

المنفذ الافتراضي هو `10000`، وواجهة الموقع تتصل به افتراضيًا من `http://localhost:10000`. إذا كنت تستخدم Backend منشورًا على Render أو Vercel، **يجب نشر نسخة الـ backend المحدثة عليه أولًا** وضبط `VITE_ADMIN_API_BASE_URL` في `.env.local` ثم إعادة تشغيل Vite. تشغيل الواجهة فقط لن يضيف المسارات الجديدة إلى الخادم القديم.

### تشغيل خرائط 2GIS محليًا

إذا كنت ستستخدم البحث الخارجي عن العيادات على خرائط 2GIS، شغّل في PowerShell آخر:

```powershell
cd "C:\Users\Samar\Desktop\PetCaree"
npm.cmd run dev:maps:api
```

واستخدم `npm.cmd run dev:maps:web` للواجهة ليُفعَّل الـ proxy؛ أمر `npm.cmd run dev` العادي لا يحتوي إعداد proxy للخرائط في هذه النسخة.

## الصفحات والوظائف

- `/clinic`: نموذج تسجيل العيادة، رفع مستندات تجريبية، متابعة الموافقة، إضافة الخدمات وإدارة الحجوزات.
- `/nearby/our/veterinary`: قائمة العيادات المعتمدة وحجز موعد للحيوانات الخاصة بالمستخدم.
- `/store/manager`: طلب تسجيل المتجر، ثم إدارة المنتجات بعد موافقة Admin.
- `/admin`: قسما **Clinics** و**Stores** لمراجعة الطلبات والموافقة أو الرفض أو طلب التعديلات بواسطة Admin معتمد.
- العيادات المستقلة لا تظهر للعميل إلا بعد موافقة Admin، وكل مدير يدير عيادته فقط.
- اختيار نوع الحساب لا يمنح امتيازات تجارية؛ الخادم يتحقق من حالة الموافقة قبل إدارة الخدمات أو المنتجات.
- الحجز يبدأ `pending`، ولا يتحول إلى `confirmed` إلا بعد تأكيد العيادة.

## حدود النسخة

- هذا تحديث MVP للديمو؛ لا ترفع بطاقات هوية حقيقية أو تراخيص حساسة قبل تنفيذ تخزين خاص وآمن للمستندات.
- رفع مستندات العيادة معطّل خارج Firebase Emulator إلى أن يتوفر تخزين خاص للإنتاج. يمكن اختبار الصور التجريبية فقط داخل Emulator.
- طلب المتجر لا يطلب ملفات هوية؛ Admin يراجع بيانات المنشأة المدخلة. لا ينشر المتجر منتجات قبل الموافقة.
- لا توجد بوابة دفع حقيقية أو إدارة شيفتات الأطباء في هذا التحديث.
- لم تُضمَّن ملفات `.env.local` أو `.env.server.local` أو `node_modules` أو بيانات اعتماد Firebase داخل ملف التحديث حفاظًا على إعداداتك وخصوصيتها.
- اختبارات `npm.cmd test` تختبر المنطق محليًا، لكنها لا تثبت اتصال الـ backend الفعلي بحساب Firebase حتى تضبطه وتجربه.
