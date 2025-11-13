export function normalizeAgendaData(rows: any) {
  const map = new Map<string, any>();

  for (const r of rows) {
    const id: string = r.dailyReportId;

    if (!map.has(id)) {
      map.set(id, {
        portionType: r.portionType ?? "DEFAULT",
        menuPlan: {
          id: r.menuPlan?.id ?? null,
          name: r.menuPlan?.name ?? null,
          date: r.date ?? null,
          foodItems: [],
        },
        steps: [],
      });
    }

    const ag = map.get(id);

    if (r.foodItem?.id) {
      const existing = ag.menuPlan.foodItems.find((fi: any) => fi.id === r.foodItem.id);
      if (!existing) {
        ag.menuPlan.foodItems.push({
          id: r.foodItem.id,
          description: r.foodItem.description ?? null,
          name: r.foodItem.name ?? null,
          type: r.foodItem.type ?? null,
          foodId: r.foodItem.id,
          suppliers: [],
        });
      }

      if (r.supplier?.id) {
        const fi = ag.menuPlan.foodItems.find((x: any) => x.id === r.foodItem.id);
        if (fi && !fi.suppliers.some((s: any) => s.id === r.supplier.id)) {
          fi.suppliers.push({
            id: r.supplier.id,
            name: r.supplier.name,
            address: r.supplier.address,
            phoneNumber: r.supplier.phoneNumber,
          });
        }
      }
    }

    if (r.step?.id) {
      let stepItem = ag.steps.find((s: any) => s.id === r.step.id);
      if (!stepItem) {
        stepItem = {
          id: r.step.id,
          isCompleted: r.step.isCompleted ?? false,
          notes: r.step.notes ?? null,
          stepKey: r.stepMeta?.stepKey ?? null,
          stepName: r.stepMeta?.stepName ?? null,
          stepOrder: r.stepMeta?.stepOrder ?? null,
          imageURLs: [],
        };
        ag.steps.push(stepItem);
      }

      if (r.storage?.imageURL && !stepItem.imageURLs.includes(r.storage.imageURL)) {
        stepItem.imageURLs.push(r.storage.imageURL);
      }
    }
  }

  const result = Array.from(map.values()).map((item) => {
    item.steps = item.steps.sort((a: any, b: any) => (a.stepOrder ?? 0) - (b.stepOrder ?? 0));
    return item;
  });

  return result;
}
