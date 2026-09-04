import {
  BarChart3, CirclePlus, Crown, FileText, Gift, LogOut, Package,
  Palette, Printer, ScanLine, Scale, Settings, UserPlus,
} from "lucide-react";
import type { ComponentType, CSSProperties } from "react";
import { referenceAssets } from "../../assets/reference";
import { dashboardFixture } from "./dashboard.fixture";

type Crop = { x: number; y: number; width: number; height: number };

const categoryCrops: Crop[] = [
  { x: 12, y: 7, width: 95, height: 65 },
  { x: 133, y: 7, width: 94, height: 65 },
  { x: 248, y: 7, width: 104, height: 65 },
  { x: 367, y: 6, width: 105, height: 67 },
  { x: 493, y: 7, width: 93, height: 65 },
  { x: 609, y: 7, width: 101, height: 65 },
  { x: 725, y: 9, width: 110, height: 62 },
];

const deviceCrops: Crop[] = [
  { x: 15, y: 7, width: 100, height: 76 },
  { x: 146, y: 8, width: 97, height: 74 },
  { x: 286, y: 8, width: 78, height: 74 },
];

function cropStyle(asset: string, crop: Crop, atlasWidth: number, atlasHeight: number): CSSProperties {
  return {
    width: crop.width,
    height: crop.height,
    backgroundImage: `url("${asset}")`,
    backgroundRepeat: "no-repeat",
    backgroundSize: `${atlasWidth}px ${atlasHeight}px`,
    backgroundPosition: `-${crop.x}px -${crop.y}px`,
  };
}

const metricIcons: Record<string, ComponentType<{ size?: number }>> = {
  weight: Scale,
  outbound: ScanLine,
  packaged: Gift,
  printed: Printer,
  products: Package,
};

function Sparkline({ tone }: { tone: string }) {
  return <span className={"sparkline " + tone}><i/><i/><i/><i/><i/><i/></span>;
}

function MetricCard({ item }: { item: (typeof dashboardFixture.metrics)[number] }) {
  const Icon = metricIcons[item.id];
  return (
    <article className={"metric-card tone-" + item.tone} data-testid="metric-card">
      <div className="metric-head"><span>{item.label}</span><b><Icon size={18}/></b></div>
      <div className="metric-main"><strong>{item.value}</strong><small>{item.unit}</small></div>
      <div className="metric-foot"><span>{item.hint} <em>{item.delta}</em></span><Sparkline tone={item.tone}/></div>
    </article>
  );
}

function HeroCard() {
  return (
    <article className="hero-card" data-testid="hero-jewelry-card">
      <div className="hero-meta"><span>10:24:38</span><span>۱۴۰۴</span><span>۱۷ تیر</span><Crown size={18}/></div>
      <img src={referenceAssets.heroJewelry} alt="جواهر طلایی" />
      <p>خوش آمدید؛ امروز عملکرد عالی داشته‌اید.</p>
    </article>
  );
}

function DailyActivityChart() {
  return (
    <section className="panel chart-panel" data-testid="daily-activity-chart">
      <div className="panel-title"><h3>نمودار فعالیت روزانه</h3><button>۷ روز گذشته⌄</button></div>
      <div className="legend"><span className="l-gold">محصولات</span><span className="l-blue">لیبل چاپ شده</span><span className="l-purple">بسته‌بندی</span><span className="l-cyan">خروج کالا</span></div>
      <div className="bars">
        {dashboardFixture.bars.map((set, day) => (
          <div className="bar-group" key={day}>
            <div className="bar gold" style={{ height: set[0] + "%" }}/>
            <div className="bar blue" style={{ height: set[1] + "%" }}/>
            <div className="bar purple" style={{ height: set[2] + "%" }}/>
            <div className="bar cyan" style={{ height: set[3] + "%" }}/>
            <small>11/{10 + day}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function CategoryDonut() {
  return (
    <section className="panel donut-panel" data-testid="category-donut">
      <div className="panel-title"><h3>توزیع براساس دسته‌بندی</h3></div>
      <div className="donut-wrap">
        <div className="donut"><div><strong>128</strong><span>محصول</span></div></div>
        <ul>
          <li><i className="c1"/>انگشتر <b>28%</b></li><li><i className="c2"/>دستبند <b>18%</b></li>
          <li><i className="c3"/>گردنبند <b>15%</b></li><li><i className="c4"/>سرویس <b>12%</b></li>
          <li><i className="c5"/>گوشواره <b>10%</b></li><li><i className="c6"/>پلاک <b>9%</b></li>
          <li><i className="c7"/>سایر <b>8%</b></li>
        </ul>
      </div>
    </section>
  );
}

function RecentActivity() {
  return (
    <section className="panel recent-panel">
      <div className="panel-title"><h3>فعالیت‌های اخیر</h3><a>مشاهده همه</a></div>
      <div className="activity-list">
        {dashboardFixture.recent.map(([time, title, code, tone]) => (
          <div className="activity-row" data-testid="recent-activity-row" key={code}>
            <span className={"activity-icon " + tone}>{tone === "blue" ? "▣" : tone === "green" ? "↗" : tone === "purple" ? "◆" : "◇"}</span>
            <div><b>{title}</b><small>کد: {code}</small></div>
            <i className={tone}/><time>{time}</time><span>⌄</span>
          </div>
        ))}
      </div>
    </section>
  );
}

const quick = [
  ["محصول جدید", CirclePlus], ["چاپ لیبل", Printer], ["خروج کالا", LogOut], ["طراحی لیبل", Palette],
  ["مشتری جدید", UserPlus], ["سفارش جدید", FileText], ["گزارش‌گیری", BarChart3], ["تنظیمات", Settings],
] as const;

function QuickActions() {
  return (
    <section className="panel quick-panel">
      <div className="panel-title"><h3>دسترسی سریع</h3></div>
      <div className="quick-grid">
        {quick.map(([label, Icon]) => <button key={label}><span><Icon size={22}/></span><small>{label}</small></button>)}
      </div>
    </section>
  );
}

function CategoryGallery() {
  return (
    <section className="panel categories-panel">
      <div className="panel-title"><h3>دسته‌بندی‌های اصلی</h3><a>مدیریت دسته‌بندی‌ها</a></div>
      <div className="category-grid">
        {dashboardFixture.categories.map(([name, count], i) => {
          const crop = categoryCrops[i];
          const cropId = `${crop.x},${crop.y},${crop.width},${crop.height}`;
          return (
            <article className="category-card" data-testid="category-card" key={name}>
              <div className="category-art-frame">
                <div
                  className="category-art"
                  data-testid="category-image"
                  data-crop={cropId}
                  style={cropStyle(referenceAssets.categories, crop, 840, 80)}
                />
              </div>
              <b>{name}</b><small>{count}</small>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function PrintQueue() {
  return (
    <section className="panel queue-panel">
      <div className="panel-title"><h3>صف چاپ</h3><span className="queue-badge">۵ مورد</span></div>
      <div className="queue-list">
        {dashboardFixture.queue.map(([code, category, count, status, progress], i) => (
          <div className="queue-row" data-testid="print-queue-row" key={code}>
            <span className="queue-num">{i + 1}</span><code>{code}</code><span>{category}</span><span>{count}</span>
            <b>{status}</b>{i === 0 ? <div className="progress"><i style={{ width: progress }}/></div> : <span className="queue-status-icon">◷</span>}
          </div>
        ))}
      </div>
      <button className="clear-queue">پاک کردن صف</button>
    </section>
  );
}

function DeviceStrip() {
  const devices = [
    ["ترازوی دیجیتال", "A&D GX-3002A", "0.000 g", "متصل"],
    ["چاپگر لیبل", "Zebra ZD421", "وضعیت: آماده", "متصل"],
    ["پایگاه داده", "SQL Server 2019", "پینگ: 3ms", "متصل"],
  ];
  return (
    <section className="device-strip">
      {devices.map(([name, model, value, status], i) => {
        const crop = deviceCrops[i];
        const cropId = `${crop.x},${crop.y},${crop.width},${crop.height}`;
        return (
          <article className="device-card" data-testid="device-card" key={name}>
            <div className="device-art-frame">
              <div
                className="device-art"
                data-testid="device-image"
                data-crop={cropId}
                style={cropStyle(referenceAssets.devices, crop, 390, 90)}
              />
            </div>
            <div className="device-copy"><b>{name}<i/></b><span>{model}</span></div>
            <div className="device-value"><small>{status}</small><strong>{value}</strong></div>
          </article>
        );
      })}
    </section>
  );
}

export function Dashboard() {
  return (
    <main className="dashboard" data-testid="dashboard">
      <section className="dashboard-top">{dashboardFixture.metrics.map((item) => <MetricCard key={item.id} item={item}/>)}<HeroCard/></section>
      <section className="analytics-grid"><DailyActivityChart/><CategoryDonut/><RecentActivity/></section>
      <section className="operations-grid"><QuickActions/><CategoryGallery/><PrintQueue/></section>
      <DeviceStrip/>
    </main>
  );
}
