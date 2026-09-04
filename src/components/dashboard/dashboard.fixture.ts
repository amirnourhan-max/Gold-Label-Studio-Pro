export type MetricTone = "gold" | "blue" | "purple" | "green";
export interface MetricItem {
  id: "weight" | "outbound" | "packaged" | "printed" | "products";
  label: string; value: string; unit: string; delta: string; hint: string; tone: MetricTone;
}
export const dashboardFixture = {
  metrics: [
    { id:"weight",label:"وزن کل امروز",value:"۴۸۳.۷۲۵",unit:"گرم",delta:"+11%",hint:"نسبت به دیروز",tone:"gold" },
    { id:"outbound",label:"خروجی اسکن شده",value:"۷۶",unit:"عدد",delta:"+8%",hint:"نسبت به دیروز",tone:"green" },
    { id:"packaged",label:"آیتم‌های بسته‌بندی شده",value:"۹۴",unit:"عدد",delta:"+5%",hint:"نسبت به دیروز",tone:"purple" },
    { id:"printed",label:"لیبل‌های چاپ شده",value:"۱۲۶",unit:"عدد",delta:"+9%",hint:"نسبت به دیروز",tone:"blue" },
    { id:"products",label:"محصولات امروز",value:"۱۲۸",unit:"عدد",delta:"+12%",hint:"نسبت به دیروز",tone:"gold" }
  ] satisfies MetricItem[],
  categories:[["انگشتر","۲۴۵ محصول"],["دستبند","۱۸۶ محصول"],["گردنبند","۱۴۲ محصول"],["گوشواره","۹۸ محصول"],["پلاک","۶۳ محصول"],["سرویس","۹۱ محصول"],["سایر","۴۶ محصول"]],
  recent:[["10:22","لیبل چاپ شد","R-250904-00125","blue"],["10:18","خروج کالا ثبت شد","E-250904-00087","green"],["10:15","محصول جدید ثبت شد","N-250904-00056","gold"],["10:12","بسته‌بندی انجام شد","PK-250904-00033","purple"],["10:08","لیبل چاپ شد","E-250904-00102","blue"]],
  queue:[["R-250904-00130","انگشتر","2","در حال چاپ","65%"],["N-250904-00131","گردنبند","1","در صف","—"],["B-250904-00132","دستبند","3","در صف","—"],["S-250904-00133","سرویس","1","در انتظار","—"],["P-250904-00134","پلاک","4","در انتظار","—"]],
  bars:[[58,47,28,16],[76,55,38,21],[73,61,46,30],[88,67,52,33],[64,51,37,24],[45,39,31,23],[69,49,42,20]]
} as const;