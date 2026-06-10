# دليل تشغيل واستخدام نظام تقييم المهارات — Skill Matrix System
### مجموعة العربي | إدارة الغسالات (WM Department)

مرحباً بك في دليل التشغيل الكامل لنظام تقييم المهارات. تم تصميم هذا النظام لتقييم واختبار موظفي مجموعة العربي، وتتبع مستوياتهم وقياس مدى تطور أدائهم قبل وبعد الدورات التدريبية.

---

## 📌 الفهرس
1. [دورة حياة الاختبار للموظف (Exam Flow)](#1-دورة-حياة-الاختبار-للموظف-exam-flow)
2. [لوحة التحكم والإدارة (Admin Dashboard)](#2-لوحة-التحكم-والإدارة-admin-dashboard)
3. [نظام رفع البيانات عبر ملفات Excel (آلية الدمج والتحديث)](#3-نظام-رفع-البيانات-عبر-ملفات-excel-آلية-الدمج-والتحديث)
4. [آلية إعادة الاختبار وتتبع المحاولات (Exam Retakes)](#4-آلية-إعادة-الاختبار-وتتبع-المحاولات-exam-retakes)
5. [تجهيز البيئة وقاعدة البيانات (SQL Scripts)](#5-تجهيز-البيئة-وقاعدة-البيانات-sql-scripts)
6. [صيغ وهياكل ملفات الرفع (Excel Templates)](#6-صيغ-وهياكل-ملفات-الرفع-excel-templates)

---

## 1. دورة حياة الاختبار للموظف (Exam Flow)

يتميز النظام بواجهة مبسطة للموظفين لتجنب تشتيتهم أثناء الاختبار:
1. **تسجيل الدخول**: يدخل الموظف رقم **SAP** الخاص به. يقوم النظام فوراً بالتحقق وجلب الاسم والقسم الخاص به تلقائياً للتأكيد.
2. **كلمة المرور**: يقوم الموظف بإدخال كلمة المرور الافتراضية (والتي تتكون افتراضياً من: **آخر رقمين من الرقم القومي + آخر رقمين من رقم الهاتف**).
3. **التحقق الأمني**: يقوم النظام بالتحقق من:
   * هل الحساب نشط؟ (أو موقوف من قبل المسؤول).
   * هل الجهاز مصرح به؟ (اعتماداً على إعدادات حظر أو تداخل الأجهزة المشتركة).
   * هل الموظف مسموح له بدخول الاختبار حالياً؟ (تحتوي قاعدة البيانات على خيار `exam_allowed` لمنع تكرار الاختبار دون إذن).
4. **تحميل الأسئلة**: يتم سحب الأسئلة عشوائياً وبشكل فوري من قاعدة البيانات طبقاً للتهيئة المحددة لقسم الموظف (مثال: 5 أسئلة سلامة + 10 أسئلة جودة).
5. **العداد التنازلي**: يبدأ المؤقت الدائري بالعد التنازلي بالدقائق المحددة في الإعدادات. يتغير لون المؤقت إلى البرتقالي ثم الأحمر مع اقتراب الوقت من النهاية.
6. **الإرسال**:
   * **إرسال يدوي**: لا يسمح النظام بالإرسال اليدوي إلا بعد الإجابة على جميع الأسئلة. إذا نسي الموظف سؤالاً، سيقوم النظام بتوجيهه تلقائياً للسؤال الأول غير المجاب عليه.
   * **إرسال قسري (انتهاء الوقت)**: عند انتهاء الوقت، يتم تجميع وإرسال كافة الإجابات المختارة فوراً، وتُعتبر الأسئلة غير المجابة خاطئة.
7. **إظهار النتيجة**: تظهر النسبة المئوية فوراً للموظف معVerdict (ناجح 🎉 / لم ينجح 😔). حد النجاح الافتراضي هو **70%**.

---

## 2. لوحة التحكم والإدارة (Admin Dashboard)

تم تنظيم لوحة التحكم في 7 تبويبات رئيسية لتسهيل الإدارة:

### أ. الموظفون (Employees)
* يمكنك استعراض جميع الموظفين، البحث عنهم بالاسم أو رقم SAP، وتصفيتهم حسب القسم أو الحالة.
* **إجراءات الموظف**:
  * **تعديل**: تعديل بيانات الموظف (الاسم، كلمة المرور، الرقم القومي، الهاتف، القسم).
  * **تفعيل/إيقاف**: إيقاف حساب الموظف مؤقتاً لمنعه من دخول أي اختبار.
  * **حظر/فك الجهاز**: ربط أو فك ربط جهاز الكمبيوتر الخاص بالموظف لتجنب الغش أو مشاركة الحسابات.
  * **السماح بالاختبار (إعادة الاختبار)**: إعطاء إذن للموظف لأداء الاختبار مرة أخرى (سواء كان قد أداه سابقاً أو لم يؤده).
* **الإجراءات الجماعية (Bulk Actions)**: عند تحديد مجموعة من الموظفين عبر مربعات الاختيار (Checkboxes)، تظهر شريط الإجراءات الجماعية:
  * **حذف المحدد**: حذف الحسابات المحددة نهائياً.
  * **تصدير Excel**: تصدير قائمة الموظفين المحددين فقط إلى ملف Excel.
  * **السماح بالاختبار للمحددين**: تفعيل إمكانية الاختبار دفعة واحدة للمجموعة المحددة (مناسب بعد الانتهاء من تدريبهم).
  * **حظر المحددين من الاختبار**: إلغاء إذن الاختبار فوراً للمجموعة المحددة.

### ب. الأسئلة (Questions)
* استعراض بنك الأسئلة بالكامل، وتصفيتها حسب الفئة (Category) أو النوع (اختيار متعدد MCQ / صح وخطأ TF).
* إضافة وتعديل الأسئلة يدوياً أو رفعها جماعياً.
* **الإجراءات الجماعية**: حذف الأسئلة المحددة أو تصديرها إلى ملف Excel.

### ج. الأقسام وإعدادات الاختبار (Depts)
* تتيح لك إنشاء الأقسام (مثل: البلاستيك، التجميع، الجودة).
* **تهيئة الاختبار**: يمكنك تحديد عدد الأسئلة التي يجب سحبها عشوائياً لكل قسم من كل فئة. 
  *(مثال: قسم التجميع يحتاج 5 أسئلة من فئة "أمان" و 5 أسئلة من فئة "تجميع"، ليكون إجمالي اختبار القسم 10 أسئلة).*

### د. النتائج (Results)
* تعرض تاريخ جميع الاختبارات التي تم تقديمها مرتبة من الأحدث إلى الأقدم.
* **تعدد المحاولات**: يعرض جدول النتائج عمود **"المحاولة"** (مثل: المحاولة الأولى، المحاولة الثانية) لكل موظف لمعرفة عدد المرات التي اختبر فيها وتتبع تطور نتيجته.
* **زر عرض**: يفتح نافذة منبثقة تعرض ورقة إجابة الموظف بالتفصيل (السؤال، إجابة الموظف، الإجابة الصحيحة، النتيجة صح ✓ أم خطأ ✗).
* **زر حذف**: لحذف نتيجة معينة نهائياً من سجلات النظام.

### هـ. تحليل الأسئلة (Analysis)
* يعرض رسماً بيانياً لأكثر 10 أسئلة صعوبة في النظام (التي حصلت على أقل نسب نجاح).
* يعرض جدولاً تفصيلياً لكل سؤال (عدد مرات ظهوره للموظفين، كم مرة تمت الإجابة عليه بشكل صحيح، كم مرة بشكل خاطئ، ونسبة النجاح الإجمالية للسؤال).
* **زر التفاصيل**: يفتح نافذة منبثقة تعرض قائمة بكافة الموظفين الذين واجهوا هذا السؤال، وإجابة كل موظف، مع توضيح رقم المحاولة وتاريخها.
* **تصدير Excel**: يقوم بتوليد ملف Excel متكامل يحتوي على صفحتين:
  1. **الصفحة الأولى (تحليل الأسئلة)**: إحصائيات نسب النجاح والصعوبة لكل سؤال.
  2. **الصفحة الثانية (إجابات الموظفين التفصيلية)**: ورقة عمل ضخمة تسرد كل إجابة قدمها كل موظف على كل سؤال مع رقم المحاولة وتاريخها، ومظللة بالألوان (الأخضر للإجابة الصحيحة، والأحمر للإجابة الخاطئة) لتسهيل الفلترة والتحليل.

### و. المستخدمون (Users)
* إدارة حسابات المشرفين والمديرين الذين يحق لهم دخول لوحة التحكم.

### ز. إعدادات النظام (Settings)
* **وضع التحقق من الجهاز (Device Fingerprinting)**:
  * **صارم**: يرتبط كل جهاز كمبيوتر بموظف واحد فقط بعد أول استخدام.
  * **مرن**: يُسمح للموظفين باستخدام أجهزة مشتركة (مناسب للمصانع والورش).
  * **معطل**: إلغاء أي قيود متعلقة بالأجهزة.
* **مدة الاختبار (Exam Duration)**: إدخال مدة الاختبار بالدقائق (يتم حفظها في قاعدة البيانات وتطبيقها فوراً على شاشة اختبار الموظف).

---

## 3. نظام رفع البيانات عبر ملفات Excel (آلية الدمج والتحديث)

عند استخدام ميزة **"رفع Excel"** للموظفين أو الأسئلة، يعمل النظام بآلية **الدمج والتحديث الذكي (Upsert)**، وهي تضمن ما يلي:

### أ. عند رفع الموظفين:
1. يقرأ النظام رقم الـ **SAP** لكل موظف في الملف.
2. **إذا كان رقم الـ SAP جديداً**: يتم إضافة (إدراج) الموظف كعضو جديد في النظام.
3. **إذا كان رقم الـ SAP موجوداً مسبقاً**: يتم **تحديث** بيانات الموظف الحالية (مثل تعديل الاسم، كلمة المرور الجديدة، أو نقله لقسم آخر) لتطابق البيانات الواردة في الملف الجديد.
4. **حماية البيانات الحالية**: لا يقوم النظام بحذف أي موظف مسجل حالياً إذا لم يكن اسمه موجوداً في ملف Excel المرفوع. البيانات القديمة تظل آمنة تماماً.

### ب. عند رفع الأسئلة:
1. يقرأ النظام رقم السؤال المعرف **Q_ID** لكل سؤال في الملف.
2. **إذا كان رقم السؤال جديداً**: يتم إضافته إلى بنك الأسئلة.
3. **إذا كان رقم السؤال موجوداً مسبقاً**: يتم **تعديل وتحديث** نص السؤال، خياراته، أو إجابته الصحيحة لتطابق التعديلات الجديدة في الملف.
4. **حماية الأسئلة الحالية**: الأسئلة القديمة غير الموجودة في الملف المرفوع تظل محفوظة في قاعدة البيانات ولا يتم حذفها.

---

## 4. آلية إعادة الاختبار وتتبع المحاولات (Exam Retakes)

لمتابعة أثر التدريب وقياس تحسن الأداء (مقارنة نتائج الاختبار القبلي بالبعدي):

1. **الوضع الافتراضي (قفل الاختبار)**: بمجرد أن ينهي الموظف اختباره ويضغط إرسال، تقوم قاعدة البيانات تلقائياً بتحديث حالة الموظف وجعل خيار `exam_allowed = false` لحظر دخوله مجدداً.
2. **منح إذن إعادة الاختبار**:
   * يذهب المسؤول إلى تبويب **الموظفون**.
   * يقوم بتحديد الموظف المعني ويضغط **السماح بالاختبار** (أو يحدد مجموعة موظفين ويضغط على الزر الجماعي **السماح بالاختبار للمحددين**).
   * يتم تغيير حالة `exam_allowed` في قاعدة البيانات إلى `true` لهؤلاء الموظفين.
3. **أداء الاختبار الجديد**:
   * يسجل الموظف الدخول بشكل طبيعي، ويفتح له النظام اختباراً جديداً بأسئلة عشوائية ومؤقت كامل.
   * عند إرسال الإجابات، تُحسب النتيجة وتُحفظ كـ **محاولة جديدة** (مثال: محاولة رقم 2).
   * يُقفل النظام الحساب تلقائياً مرة أخرى بعد الإرسال (`exam_allowed = false`).
4. **مقارنة وتحليل النتائج**:
   * في تبويب **النتائج**، ستظهر محاولات الموظف منفصلة (المحاولة 1 ثم المحاولة 2).
   * يمكنك مقارنة درجاته وقياس نسبة تطوره.
   * في تقرير الـ Excel المصدر، يظهر عمود **"المحاولة"** ليوضح بالتفصيل إجابات الموظف في كل محاولة وتطور إجاباته على نفس الأسئلة.

---

## 5. تجهيز البيئة وقاعدة البيانات (SQL Scripts)

لتشغيل الخصائص الجديدة المتعلقة بإعادة الاختبار وتخطي استخدام الـ CLI، يرجى تشغيل السكريبت التالي في **Supabase SQL Editor**:

```sql
-- 1. إضافة عمود إذن الاختبار للموظفين (مسموح به افتراضياً للموظفين الجدد)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS exam_allowed boolean DEFAULT true;
UPDATE employees SET exam_allowed = true WHERE exam_allowed IS NULL;

-- 2. إضافة عمود رقم المحاولة لجدول النتائج لتسجيل الترتيب الزمني للمحاولات
ALTER TABLE results ADD COLUMN IF NOT EXISTS attempt_number integer DEFAULT 1;
UPDATE results SET attempt_number = 1 WHERE attempt_number IS NULL;

-- 3. إنشاء دالة احتساب النتائج الآمنة على خادم قاعدة البيانات (RPC score_exam_db)
CREATE OR REPLACE FUNCTION score_exam_db(
  p_sap text,
  p_password text,
  p_department_id uuid,
  p_responses jsonb,
  p_device_hash text
)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_emp_id uuid;
  v_emp_name text;
  v_emp_password text;
  v_emp_status integer;
  v_emp_device_block boolean;
  v_emp_exam_allowed boolean;
  v_device_check_mode text;
  v_device_exists boolean;
  v_device_blocked boolean;
  v_device_sap text;
  v_dept_name text;
  v_score integer := 0;
  v_total integer := 0;
  v_percent integer := 0;
  v_passed boolean := false;
  v_attempt_number integer := 1;
  v_saved_result_id uuid;
  v_resp_item jsonb;
  v_q_id integer;
  v_emp_answer text;
  v_correct_answer text;
  v_question_text text;
  v_category text;
  v_type text;
  v_is_correct boolean;
  v_scored_responses jsonb := '[]'::jsonb;
  v_response_row record;
  i integer;
BEGIN
  -- أ. التحقق من وجود الموظف وصحة كلمة المرور والحالة
  SELECT id, name, password, status, device_block, exam_allowed
  INTO v_emp_id, v_emp_name, v_emp_password, v_emp_status, v_emp_device_block, v_emp_exam_allowed
  FROM employees
  WHERE sap = p_sap;

  IF v_emp_id IS NULL THEN
    RAISE EXCEPTION 'رقم SAP غير موجود';
  END IF;

  IF v_emp_password <> p_password THEN
    RAISE EXCEPTION 'كلمة المرور غير صحيحة';
  END IF;

  IF v_emp_status = 0 THEN
    RAISE EXCEPTION 'تم إيقاف حسابك مؤقتاً. يرجى التواصل مع المهندس المسؤول.';
  END IF;

  IF v_emp_device_block THEN
    RAISE EXCEPTION 'هذا الجهاز مرتبط بحساب آخر. يرجى التواصل مع المهندس المسؤول.';
  END IF;

  -- ب. التحقق من إذن أداء الاختبار
  IF NOT v_emp_exam_allowed THEN
    RAISE EXCEPTION 'لقد أجريت هذا الاختبار مسبقاً. لا يُسمح بأكثر من محاولة واحدة. يرجى مراجعة المسؤول.';
  END IF;

  -- ج. جلب وضع التحقق من الأجهزة
  SELECT value INTO v_device_check_mode
  FROM settings
  WHERE key = 'device_check_mode';
  IF v_device_check_mode IS NULL THEN
    v_device_check_mode := 'strict';
  END IF;

  -- د. التحقق من الجهاز وبصمته الرقمية
  IF p_device_hash IS NOT NULL AND p_device_hash <> '' AND v_device_check_mode <> 'off' THEN
    SELECT EXISTS(SELECT 1 FROM devices WHERE device_hash = p_device_hash), blocked, sap
    INTO v_device_exists, v_device_blocked, v_device_sap
    FROM devices
    WHERE device_hash = p_device_hash;

    IF v_device_exists THEN
      IF v_device_blocked THEN
        RAISE EXCEPTION 'هذا الجهاز محظور. يرجى التواصل مع المهندس المسؤول.';
      END IF;
      IF v_device_check_mode = 'strict' AND v_device_sap <> p_sap THEN
        RAISE EXCEPTION 'هذا الجهاز مرتبط بحساب آخر. يرجى التواصل مع المهندس المسؤول.';
      END IF;
    ELSE
      -- تسجيل الجهاز الجديد تلقائياً
      INSERT INTO devices (device_hash, sap) VALUES (p_device_hash, p_sap);
    END IF;
  END IF;

  -- هـ. جلب اسم القسم
  SELECT name INTO v_dept_name FROM departments WHERE id = p_department_id;
  IF v_dept_name IS NULL THEN
    v_dept_name := 'غير حدد';
  END IF;

  -- و. تصحيح الإجابات وحساب الدرجة النهائية
  v_total := jsonb_array_length(p_responses);
  FOR i IN 0..(v_total - 1) LOOP
    v_resp_item := jsonb_extract_path(p_responses, i::text);
    v_q_id := (v_resp_item->>'q_id')::integer;
    v_emp_answer := COALESCE(v_resp_item->>'answer', '');

    SELECT answer, question, category, type INTO v_correct_answer, v_question_text, v_category, v_type
    FROM questions
    WHERE q_id = v_q_id;

    IF v_correct_answer IS NOT NULL THEN
      v_is_correct := (v_emp_answer = v_correct_answer);
      IF v_is_correct THEN
        v_score := v_score + 1;
      END IF;

      v_scored_responses := v_scored_responses || jsonb_build_object(
        'q_id', v_q_id,
        'question_text', v_question_text,
        'category', v_category,
        'type', CASE WHEN v_type = 'mcq' THEN 'MCQ' ELSE 'TF' END,
        'employee_answer', v_emp_answer,
        'correct_answer', v_correct_answer,
        'is_correct', v_is_correct
      );
    END IF;
  END LOOP;

  -- حساب النسب المئوية والنجاح والرسوب
  v_total := jsonb_array_length(v_scored_responses);
  IF v_total > 0 THEN
    v_percent := ROUND((v_score::numeric / v_total::numeric) * 100);
  ELSE
    v_percent := 0;
  END IF;
  v_passed := (v_percent >= 70);

  -- ز. حساب رقم المحاولة الحالية لهذا الموظف
  SELECT COUNT(*) INTO v_attempt_number FROM results WHERE sap = p_sap;
  v_attempt_number := v_attempt_number + 1;

  -- ح. حفظ النتيجة الإجمالية في قاعدة البيانات
  INSERT INTO results (
    sap, name, department_id, department_name, score, total, percent, passed, device_hash, attempt_number
  ) VALUES (
    p_sap, v_emp_name, p_department_id, v_dept_name, v_score, v_total, v_percent, v_passed, p_device_hash, v_attempt_number
  )
  RETURNING id INTO v_saved_result_id;

  -- ط. حفظ تفاصيل الإجابات الفردية لكل سؤال
  FOR v_response_row IN (
    SELECT 
      (val->>'q_id')::integer AS q_id,
      val->>'question_text' AS question_text,
      val->>'category' AS category,
      val->>'type' AS type,
      val->>'employee_answer' AS employee_answer,
      val->>'correct_answer' AS correct_answer,
      (val->>'is_correct')::boolean AS is_correct
    FROM jsonb_array_elements(v_scored_responses) AS val
  ) LOOP
    INSERT INTO responses (
      result_id, sap, department_name, q_id, question_text, category, type, employee_answer, correct_answer, is_correct
    ) VALUES (
      v_saved_result_id, p_sap, v_dept_name, v_response_row.q_id, v_response_row.question_text, v_response_row.category, 
      v_response_row.type, v_response_row.employee_answer, v_response_row.correct_answer, v_response_row.is_correct
    );
  END LOOP;

  -- ي. إلغاء إذن دخول الاختبار للموظف تلقائياً لمنع التكرار غير المصرح
  UPDATE employees SET exam_allowed = false WHERE sap = p_sap;

  -- ك. إرجاع ملخص النتيجة للمتصفح
  RETURN jsonb_build_object(
    'score', v_score,
    'total', v_total,
    'percent', v_percent,
    'passed', v_passed,
    'name', v_emp_name,
    'department_name', v_dept_name
  );
END;
$$;
```

---

## 6. صيغ وهياكل ملفات الرفع (Excel Templates)

لضمان نجاح عملية استيراد البيانات وتجنب الأخطاء، يرجى مطابقة العناوين وأشكال البيانات التالية تماماً:

### أ. ملف الموظفين (Employees Template)
يجب أن تحتوي الصفحة الأولى في ملف الـ Excel على الأعمدة التالية في الصف الأول:

| SAP | Name | Department | Password | NationalID | Phone | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 80001234 | أحمد محمد علي | البلاستيك | 1234 | 29901010101234 | 01012345678 | 1 |

* **SAP**: رقم الـ SAP الفريد للموظف (نص أو أرقام).
* **Department**: اسم القسم (يجب أن يطابق تماماً الأقسام المسجلة في لوحة التحكم، وإذا كان القسم جديداً فسيقوم النظام بإنشائه تلقائياً).
* **Password**: كلمة المرور الخاصة بدخول الموظف.
* **NationalID / Phone**: الرقم القومي ورقم الهاتف (اختياري، لكن مفيد كمرجع لكلمة المرور الافتراضية).
* **Status**: حالة الحساب (`1` للتفعيل، `0` للإيقاف والحظر).

### ب. ملف الأسئلة (Questions Template)
يجب أن يحتوي ملف الأسئلة على الأعمدة التالية تماماً:

| Q_ID | Category | Type | Question | Opt_A | Opt_B | Opt_C | Opt_D | Answer |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 101 | أمان | mcq | ما هو الإجراء الصحيح عند حدوث تسريب؟ | إيقاف الماكينة | تجاهل الأمر | إبلاغ الزميل | تنظيف الأرضية فقط | A |
| 102 | جودة | t/f | يجب فحص المنتج قبل التعبئة النهائية. | | | | | 1 |

* **Q_ID**: رقم تعريفي فريد للسؤال (أرقام صحيحة فقط).
* **Category**: فئة السؤال (مثل: سلامة، جودة، تشغيل).
* **Type**: نوع السؤال (اكتب `mcq` للاختيار المتعدد، أو `t/f` لأسئلة صح/خطأ).
* **Question**: نص السؤال بالتفصيل.
* **Opt_A / Opt_B / Opt_C / Opt_D**: الخيارات الأربعة لأسئلة الاختيار المتعدد (اتركها فارغة تماماً لأسئلة الصح والخطأ).
* **Answer**: الإجابة الصحيحة:
  * لأسئلة الاختيار المتعدد: اكتب الحرف الكبير المقابل للجواب الصحيح (`A` أو `B` أو `C` أو `D`).
  * لأسئلة الصح والخطأ: اكتب الرقم `1` للإجابة (صح)، أو الرقم `0` للإجابة (خطأ).
