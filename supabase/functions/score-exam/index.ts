// supabase/functions/score-exam/index.ts
// Deploy: supabase functions deploy score-exam
// This keeps correct answers server-side — never exposed to browser

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();
    const { sap, password, department_id, responses, device_hash } = body;

    // 1. Verify employee
    const { data: employee, error: empError } = await supabase
      .from("employees")
      .select("id, name, department_id, password, status, device_block")
      .eq("sap", sap)
      .single();

    if (empError || !employee) {
      return new Response(
        JSON.stringify({ error: "رقم SAP غير موجود" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (employee.password !== password) {
      return new Response(
        JSON.stringify({ error: "كلمة المرور غير صحيحة" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (employee.status === 0) {
      return new Response(
        JSON.stringify({ error: "تم إيقاف حسابك مؤقتاً. يرجى التواصل مع المهندس المسؤول." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (employee.device_block) {
      return new Response(
        JSON.stringify({ error: "هذا الجهاز مرتبط بحساب آخر. يرجى التواصل مع المهندس المسؤول." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Check if already submitted
    const { data: existingResult } = await supabase
      .from("results")
      .select("id")
      .eq("sap", sap)
      .single();

    if (existingResult) {
      return new Response(
        JSON.stringify({ error: "لقد أجريت هذا الاختبار مسبقاً. لا يُسمح بأكثر من محاولة واحدة." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Check device
    if (device_hash) {
      const { data: device } = await supabase
        .from("devices")
        .select("sap, blocked")
        .eq("device_hash", device_hash)
        .single();

      if (device) {
        if (device.blocked) {
          return new Response(
            JSON.stringify({ error: "هذا الجهاز محظور. يرجى التواصل مع المهندس المسؤول." }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (device.sap !== sap) {
          return new Response(
            JSON.stringify({ error: "هذا الجهاز مرتبط بحساب آخر. يرجى التواصل مع المهندس المسؤول." }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        // Register device
        await supabase.from("devices").insert({ device_hash, sap });
      }
    }

    // 4. Fetch correct answers server-side
    const q_ids = responses.map((r: any) => r.q_id);
    const { data: questions, error: qError } = await supabase
      .from("questions")
      .select("q_id, question, category, type, answer, opt_a, opt_b, opt_c, opt_d")
      .in("q_id", q_ids);

    if (qError || !questions) {
      return new Response(
        JSON.stringify({ error: "خطأ في تحميل الأسئلة" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Score the exam
    const answerMap = new Map(questions.map((q: any) => [q.q_id, q]));
    let score = 0;
    const scoredResponses = [];

    for (const resp of responses) {
      const q = answerMap.get(resp.q_id);
      if (!q) continue;
      const is_correct = resp.answer === q.answer;
      if (is_correct) score++;
      scoredResponses.push({
        sap,
        department_name: resp.department_name,
        q_id: q.q_id,
        question_text: q.question,
        category: q.category,
        type: q.type === "mcq" ? "MCQ" : "TF",
        employee_answer: resp.answer,
        correct_answer: q.answer,
        is_correct,
      });
    }

    const total = scoredResponses.length;
    const percent = total > 0 ? Math.round((score / total) * 100) : 0;
    const passed = percent >= 70;

    // 6. Get department name
    const { data: dept } = await supabase
      .from("departments")
      .select("name")
      .eq("id", department_id)
      .single();

    const department_name = dept?.name ?? "غير محدد";

    // 7. Save result
    const { data: savedResult, error: saveError } = await supabase
      .from("results")
      .insert({
        sap,
        name: employee.name,
        department_id,
        department_name,
        score,
        total,
        percent,
        passed,
        device_hash,
      })
      .select()
      .single();

    if (saveError || !savedResult) {
      return new Response(
        JSON.stringify({ error: "خطأ في حفظ النتيجة" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 8. Save responses
    const responsesWithResultId = scoredResponses.map((r) => ({
      ...r,
      result_id: savedResult.id,
    }));

    await supabase.from("responses").insert(responsesWithResultId);

    // 9. Return score only — no answers
    return new Response(
      JSON.stringify({
        score,
        total,
        percent,
        passed,
        name: employee.name,
        department_name,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: "خطأ في الخادم" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
