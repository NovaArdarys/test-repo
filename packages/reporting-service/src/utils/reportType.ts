export const getReportTypeDate = (startDate: string, typeOfReport?: "" | "7d" | "1mo" | "3mo" | "6mo") => {
  let reportStart = startDate;

  if (typeOfReport) {
    const base = new Date(startDate);
    switch (typeOfReport) {
      case "7d":
        base.setDate(base.getDate() - 7);
        break;
      case "1mo":
        base.setMonth(base.getMonth() - 1);
        break;
      case "3mo":
        base.setMonth(base.getMonth() - 3);
        break;
      case "6mo":
        base.setMonth(base.getMonth() - 6);
        break;
    }
    reportStart = base.toISOString().slice(0, 10);
  }

  return reportStart;
};