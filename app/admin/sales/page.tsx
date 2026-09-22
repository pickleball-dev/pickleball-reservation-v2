import { createClient } from "@/lib/supabase/server";
import { formatPeso } from "@/lib/pricing";
import { SalesChart, type SalesChartPoint } from "@/components/SalesChart";
import { SalesDateFilter } from "@/components/SalesDateFilter";

/** Local-timezone YYYY-MM-DD, safe for <input type="date"> (avoids UTC shift from toISOString). */
function toDateInputValue(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default async function SalesPage({ searchParams }: { searchParams: { end?: string } }) {
  const now = new Date();
  const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  // Chart window: 7 days ending on the selected date (defaults to today).
  // Clamp to today so the filter can't be pushed into the future.
  const requestedEnd = searchParams.end ? new Date(`${searchParams.end}T00:00:00`) : now;
  const chartEndDay = requestedEnd > dayStart
    ? new Date(dayStart)
    : new Date(requestedEnd.getFullYear(), requestedEnd.getMonth(), requestedEnd.getDate());
  const chartStartDay = new Date(chartEndDay);
  chartStartDay.setDate(chartStartDay.getDate() - 6);

  const queryStart = chartStartDay < yearStart ? chartStartDay : yearStart;

  const { data } = await createClient()
    .from("reservations")
    .select("total_amount, starts_at")
    .eq("status", "confirmed")
    .gte("starts_at", queryStart.toISOString())
    .lte("starts_at", now.toISOString());

  const totalFrom = (start: Date) =>
    (data ?? []).filter((r) => new Date(r.starts_at) >= start).reduce((sum, r) => sum + Number(r.total_amount), 0);
  const cards = [["Daily sales", totalFrom(dayStart)], ["Monthly sales", totalFrom(monthStart)], ["Yearly sales", totalFrom(yearStart)]];

  const chartData: SalesChartPoint[] = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(chartStartDay); day.setDate(chartStartDay.getDate() + i);
    const nextDay = new Date(day); nextDay.setDate(day.getDate() + 1);
    const amount = (data ?? [])
      .filter((r) => { const t = new Date(r.starts_at); return t >= day && t < nextDay; })
      .reduce((sum, r) => sum + Number(r.total_amount), 0);
    return { label: `${day.toLocaleDateString("en-US", { weekday: "short" })} ${day.getMonth() + 1}/${day.getDate()}`, amount };
  });

  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-court">Administrator only</p>
      <h1 className="mt-1 font-display text-3xl font-bold">Confirmed sales</h1>
      <p className="mb-6 mt-1 text-sm text-ash">Totals include paid, confirmed reservations only.</p>
      <section className="grid gap-3 sm:grid-cols-3">
        {cards.map(([label, amount]) => (
          <article key={String(label)} className="rounded-card border border-line bg-surface p-5 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-wide text-ash">{label}</p>
            <p className="mt-2 font-display text-3xl font-bold text-court">{formatPeso(Number(amount))}</p>
          </article>
        ))}
      </section>
      <div className="mt-6">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-ash">
            7 days ending {chartEndDay.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
          <SalesDateFilter defaultValue={toDateInputValue(chartEndDay)} max={toDateInputValue(dayStart)} />
        </div>
        <SalesChart data={chartData} title="Sales, 7-day view" />
      </div>
    </div>
  );
}