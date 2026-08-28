"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { RuleExecution } from "@/hooks/use-executions";
import { coinIdentity } from "@/lib/coins";
import { formatPrice } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

/** Inspect a single rule fire — the trigger snapshot + the full action result. */
export function ExecutionDetailDialog({
  execution,
  onClose,
}: {
  execution: RuleExecution | null;
  onClose: () => void;
}) {
  const e = execution;
  const ctx = e?.triggerSnapshot?.ctx;
  const notes = e?.triggerSnapshot?.notes ?? [];
  const action = e?.actionResult ?? {};
  const symbol = ctx?.symbol;
  const id = symbol ? coinIdentity(symbol) : null;
  const ok = e?.status !== "error" && action.status !== "error";

  // Everything in the action result beyond the two fields we surface explicitly.
  const extraAction = Object.fromEntries(
    Object.entries(action).filter(([k]) => k !== "status" && k !== "detail")
  );

  return (
    <Dialog open={e !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 flex flex-col max-h-[85vh]">
        {e && (
          <>
            <DialogHeader className="px-5 pt-5 pb-4 border-b border-border text-left space-y-0 shrink-0">
              <div className="pr-8">
                <DialogTitle className="text-base flex items-center gap-2">
                  Rule fired
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0 h-4",
                      ok
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                    )}
                  >
                    {ok ? "Success" : "Error"}
                  </Badge>
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {e.rule?.name ?? "automation"} · {new Date(e.firedAt).toLocaleString()}
                </p>
              </div>
            </DialogHeader>

            <div className="overflow-y-auto px-5 py-4 scrollbar-terminal space-y-5">
              {/* Trigger snapshot */}
              <Section title="Trigger snapshot">
                <div className="grid grid-cols-2 gap-3">
                  {symbol && <Field label="Symbol" value={id ? `${id.name} (${symbol})` : symbol} />}
                  {ctx?.price !== undefined && <Field label="Price at fire" value={formatPrice(ctx.price)} />}
                  {ctx?.exchange && <Field label="Exchange" value={ctx.exchange} />}
                  {ctx?.timeframe && <Field label="Timeframe" value={ctx.timeframe} />}
                </div>
                {notes.length > 0 && (
                  <div className="mt-3">
                    <div className="text-[11px] text-muted-foreground mb-1.5">Conditions matched</div>
                    <ul className="space-y-1">
                      {notes.map((n, i) => (
                        <li
                          key={i}
                          className="text-xs font-mono text-foreground bg-secondary/60 rounded px-2 py-1"
                        >
                          {n}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Section>

              {/* Action result */}
              <Section title="Action result">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Status" value={action.status ?? e.status} />
                  {action.detail && <Field label="Detail" value={String(action.detail)} full />}
                </div>
                {Object.keys(extraAction).length > 0 && (
                  <div className="mt-3">
                    <div className="text-[11px] text-muted-foreground mb-1.5">Raw</div>
                    <pre className="text-[11px] font-mono text-foreground bg-secondary/60 rounded px-2 py-2 overflow-x-auto scrollbar-terminal">
                      {JSON.stringify(extraAction, null, 2)}
                    </pre>
                  </div>
                )}
              </Section>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={cn("rounded-lg border border-border p-2.5", full && "col-span-2")}>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold tabular-nums mt-0.5 break-words">{value}</div>
    </div>
  );
}
