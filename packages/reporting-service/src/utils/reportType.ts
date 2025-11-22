export const getReportTypeDate = (startDate: string, typeOfReport?: "" | "7d" | "1m" | "3m" | "6m") => {
  let reportStart = startDate;
  if (typeOfReport) {
    const base = new Date(startDate);
    switch (typeOfReport) {
      case "7d":
        base.setDate(base.getDate() - 7);
        break;
      case "1m":
        base.setMonth(base.getMonth() - 1);
        break;
      case "3m":
        base.setMonth(base.getMonth() - 3);
        break;
      case "6m":
        base.setMonth(base.getMonth() - 6);
        break;
    }
    reportStart = base.toISOString().slice(0, 10);
  } else {
    const base = new Date(startDate);
    base.setFullYear(base.getFullYear() - 1);
    reportStart = base.toISOString().slice(0, 10);
  }

  return reportStart;
};