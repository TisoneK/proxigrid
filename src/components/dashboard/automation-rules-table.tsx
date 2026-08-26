"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAutomationRules,
  useCreateRule,
  useToggleRule,
  useDeleteRule,
  useTriggerRule,
} from "@/hooks/use-automation-rules";
import { StatusDot } from "@/components/dashboard/status-dot";
import { Zap, Plus, Play, Trash2, Cpu } from "lucide-react";
import { toast } from "sonner";
import { timeAgo } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

export function AutomationRulesTable() {
  const { data: rules, isLoading } = useAutomationRules();
  const toggleRule = useToggleRule();
  const deleteRule = useDeleteRule();
  const triggerRule = useTriggerRule();

  return (
    <div className="card-premium lit-top relative overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border/40">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10 border border-emerald-500/20">
            <Zap className="h-3.5 w-3.5 text-emerald-300" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Automation
            </div>
            <div className="text-sm font-semibold text-foreground">
              Rules Engine
            </div>
          </div>
        </div>
        <CreateRuleDialog />
      </div>

      {/* Body */}
      <div className="p-3 flex-1">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : rules && rules.length > 0 ? (
          <div className="space-y-1.5 max-h-[28rem] overflow-y-auto pr-1 scrollbar-terminal">
            {rules.map((r) => (
              <div
                key={r.id}
                className="group relative flex items-start gap-3 rounded-md border border-border/40 bg-card/30 px-3 py-2.5 hover:bg-accent/40 hover:border-border transition-all"
              >
                {/* Status dot column */}
                <div className="flex flex-col items-center pt-1">
                  <StatusDot
                    color={r.enabled ? "emerald" : "slate"}
                    pulse={r.enabled}
                    size="md"
                    label={r.enabled ? "active" : "paused"}
                  />
                </div>

                {/* Rule content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground">
                      {r.name}
                    </span>
                    {r.enabled ? (
                      <Badge
                        variant="outline"
                        className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0 h-4 bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                      >
                        Active
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0 h-4 bg-slate-500/10 text-slate-400 border-slate-500/20"
                      >
                        Paused
                      </Badge>
                    )}
                    <span className="text-[10px] font-mono tabular-nums text-muted-foreground/60">
                      {r.trigger.exchange}:{r.trigger.symbol} · {r.trigger.timeframe}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 font-mono">
                    {r.description ||
                      `${r.trigger.conditions.length} condition${r.trigger.conditions.length !== 1 ? "s" : ""} · action: ${r.action.type}`}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5 font-mono tabular-nums">
                    Last fired: {r.lastFiredAt ? timeAgo(r.lastFiredAt) : "never"} · cooldown {r.cooldownSec}s
                  </p>
                </div>

                {/* Action controls */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={triggerRule.isPending && triggerRule.variables === r.id}
                    onClick={() => {
                      triggerRule.mutate(r.id, {
                        onSuccess: (res) => {
                          if (res.fired) {
                            toast.success(`Rule fired: ${r.name}`, {
                              description: res.evaluationNotes?.join(", ") || "Action executed",
                            });
                          } else if (res.skippedDueToCooldown) {
                            toast.warning(`Cooldown active — rule skipped`, {
                              description: `Try again in a few minutes`,
                            });
                          } else {
                            toast.info(`Conditions not met for "${r.name}"`, {
                              description: res.evaluationReasons?.join(", ") || "Market state didn't match",
                            });
                          }
                        },
                        onError: (e) => toast.error(`Failed: ${(e as Error).message}`),
                      });
                    }}
                    title="Evaluate now"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-emerald-300 hover:bg-emerald-500/10"
                  >
                    <Play className={cn("h-3.5 w-3.5", triggerRule.isPending && triggerRule.variables === r.id && "animate-pulse")} />
                  </Button>
                  <Switch
                    checked={r.enabled}
                    onCheckedChange={(checked) => {
                      toggleRule.mutate(
                        { id: r.id, enabled: checked },
                        {
                          onSuccess: () =>
                            toast.success(checked ? `Rule enabled` : `Rule paused`, {
                              description: r.name,
                            }),
                          onError: (e) => toast.error(`Failed: ${(e as Error).message}`),
                        }
                      );
                    }}
                    aria-label={`Toggle ${r.name}`}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm(`Delete rule "${r.name}"?`)) {
                        deleteRule.mutate(r.id, {
                          onSuccess: () => toast.success("Rule deleted"),
                        });
                      }
                    }}
                    title="Delete"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-300 hover:bg-rose-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyRules />
        )}
      </div>
    </div>
  );
}

function EmptyRules() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 blur-xl rounded-full" />
        <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/15 to-teal-500/10 border border-emerald-500/25">
          <Cpu className="h-5 w-5 text-emerald-300" />
        </div>
      </div>
      <p className="mt-4 text-sm font-medium text-foreground">No automation rules yet</p>
      <p className="mt-1 text-xs text-muted-foreground/70 max-w-[20rem]">
        Create your first rule to automate actions when indicator conditions are met.
      </p>
    </div>
  );
}

function CreateRuleDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [timeframe, setTimeframe] = useState("1h");
  const [indicator, setIndicator] = useState("RSI");
  const [operator, setOperator] = useState("<");
  const [value, setValue] = useState("30");
  const [actionType, setActionType] = useState<"notify" | "webhook">("notify");

  const create = useCreateRule();

  const handleCreate = () => {
    if (!name) {
      toast.error("Rule name required");
      return;
    }
    create.mutate(
      {
        name,
        description: `${indicator} ${operator} ${value} on ${symbol} ${timeframe}`,
        trigger: {
          exchange: "binance",
          symbol,
          timeframe,
          matchMode: "all",
          conditions: [
            {
              type: "indicator",
              indicator,
              operator,
              value: parseFloat(value),
              period: indicator === "RSI" ? 14 : undefined,
            },
          ],
        },
        action:
          actionType === "notify"
            ? { type: "notify", channel: "in_app" }
            : { type: "webhook", url: "" },
        cooldownSec: 300,
      },
      {
        onSuccess: () => {
          toast.success("Rule created");
          setOpen(false);
          setName("");
        },
        onError: (e) => toast.error((e as Error).message),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="h-7 text-[11px] gap-1.5 bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0 hover:from-emerald-400 hover:to-teal-500 shadow-[0_0_18px_-4px_oklch(0.78_0.19_162/0.5)]"
        >
          <Plus className="h-3 w-3" /> New Rule
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md border-border/60">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Create Automation Rule
          </DialogTitle>
          <DialogDescription>
            Define a trigger condition and an action. When the condition is met, the action fires.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="rule-name">Rule name</Label>
            <Input
              id="rule-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. BTC oversold alert"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="symbol">Symbol</Label>
              <Input
                id="symbol"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
              />
            </div>
            <div>
              <Label>Timeframe</Label>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["1m", "5m", "15m", "1h", "4h", "1d"].map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Indicator</Label>
              <Select value={indicator} onValueChange={setIndicator}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RSI">RSI</SelectItem>
                  <SelectItem value="MACD">MACD</SelectItem>
                  <SelectItem value="EMA_CROSS">EMA Cross</SelectItem>
                  <SelectItem value="BOLLINGER">Bollinger</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Operator</Label>
              <Select value={operator} onValueChange={setOperator}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["<", "<=", ">", ">=", "=="].map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="value">Value</Label>
              <Input
                id="value"
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Action</Label>
            <Select
              value={actionType}
              onValueChange={(v) => setActionType(v as "notify" | "webhook")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="notify">In-app notification</SelectItem>
                <SelectItem value="webhook">Webhook (POST)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleCreate}
            disabled={create.isPending}
            className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0 hover:from-emerald-400 hover:to-teal-500"
          >
            {create.isPending ? "Creating..." : "Create Rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


