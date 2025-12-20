export function computeAIStatus(aiList: any[]) {
  if (!aiList?.length) {
    return {
      type: null,
      status: "PENDING",
      info: "Tidak ada data AI",
      details: [],
    };
  }

  const results = aiList.map((ai: any) => {
    const type = ai.type;
    const threshold = Number(ai.threshold ?? 0);
    const output = ai.output ?? {};
    const error = output.error ?? null;

    if (error) {
      return {
        type,
        status: "FAIL",
        summary: "Gagal memproses gambar",
        thumbnail: ai.thumbnail ?? null,
        error,
      };
    }

    //
    // 1️⃣ FOOD DETECTION
    //
    if (type === "food_detection") {
      const detected = output.data?.detected?.length ?? 0;
      const notFound = output.data?.not_found ?? [];
      const authenticity = output.data?.image_authenticity ?? null;

      const score = authenticity?.confidence_score ?? null;
      const status = score >= threshold ? "OK" : "FAIL";

      return {
        type,
        status,
        score,
        threshold,
        thumbnail: ai.thumbnail ?? null,
        summary: `${detected} bahan makanan terdeteksi, ${notFound.length} tidak ditemukan`,
        missingIngredients: notFound,
      };
    }

    //
    // 2️⃣ CLEANLINESS
    //
    if (type === "cleanliness") {
      const dirtCount = output.data?.detections?.length ?? 0;
      const status = dirtCount === 0 ? "OK" : "FAIL";

      return {
        type,
        status,
        thumbnail: ai.thumbnail ?? null,
        summary: dirtCount === 0
          ? "Dapur bersih"
          : `${dirtCount} indikasi sampah terdeteksi`,
        dirtCount,
      };
    }

    //
    // 3️⃣ APD CHECK
    //
    if (type === "apd_check") {
      const persons = output.data?.persons ?? [];
      const total = persons.length;
      const nonCompliant = persons.filter((p: any) => !p.is_compliant).length;
      const status = nonCompliant === 0 ? "OK" : "FAIL";

      return {
        type,
        status,
        thumbnail: ai.thumbnail ?? null,
        summary: `${nonCompliant} dari ${total} orang tidak memenuhi APD`,
        persons: persons.map((p: any) => ({
          id: p.person_id,
          missing: p.apd_missing ?? [],
          isCompliant: p.is_compliant,
        })),
      };
    }

    //
    // fallback if type unknown
    //
    return {
      type,
      status: "OK",
      info: "Analisis tidak dikenali formatnya",
    };
  });

  //
  // 🔥 AGGREGATE FINAL STATUS
  //
  const hasFail = results.some(r => r.status === "FAIL");
  const hasOk = results.some(r => r.status === "OK");

  return {
    status: hasFail ? "FAIL" : hasOk ? "OK" : "PENDING",
    results,
  };
}
