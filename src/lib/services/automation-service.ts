/**
 * Proxigrid — AutomationService
 *
 * CRUD + execution for automation rules. The rule engine flow:
 *   1. Load enabled rules from DB
 *   2. For each rule, build RuleContext (latest candles + indicators)
 *   3. Evaluate all conditions (all/any match)
 *   4. If matched AND cooldown has elapsed, execute the action
 *   5. Persist RuleExecution record
 *
 * This service is intentionally synchronous-in-evaluation but async-in-action
 * (webhook POSTs etc. happen out-of-band).
 */

import { db } from "../db";
import { getIntelligenceService } from "./intelligence-service";
import { evaluateAll } from "../rules/conditions";
import type { BaseCondition, RuleContext } from "../rules/conditions";
import {
  executeAction,
  type ActionResult,
  type RuleAction,
} from "../rules/actions";
import type { CandleInterval } from "../exchanges/types";
import { getAdapter } from "../exchanges/registry";

export interface TriggerConfig {
  exchange: string;
  symbol: string;
  timeframe: string;
  conditions: BaseCondition[];
  matchMode: "all" | "any";
}

export interface RuleExecutionResult {
  ruleId: string;
  ruleName: string;
  fired: boolean;
  context?: RuleContext;
  evaluationNotes?: string[];
  evaluationReasons?: string[];
  actionResult?: ActionResult;
  skippedDueToCooldown?: boolean;
  firedAt?: Date;
}

export class AutomationService {
  async listRules() {
    return db.automationRule.findMany({
      orderBy: { createdAt: "desc" },
      include: { executions: { take: 5, orderBy: { firedAt: "desc" } } },
    });
  }

  async getRule(id: string) {
    return db.automationRule.findUnique({
      where: { id },
      include: { executions: { orderBy: { firedAt: "desc" }, take: 20 } },
    });
  }

  async createRule(input: {
    name: string;
    description?: string;
    trigger: TriggerConfig;
    action: RuleAction;
    enabled?: boolean;
    cooldownSec?: number;
  }) {
    return db.automationRule.create({
      data: {
        name: input.name,
        description: input.description ?? null,
        enabled: input.enabled ?? true,
        trigger: JSON.stringify(input.trigger),
        action: JSON.stringify(input.action),
        cooldownSec: input.cooldownSec ?? 300,
      },
    });
  }

  async updateRule(
    id: string,
    input: Partial<{
      name: string;
      description: string;
      enabled: boolean;
      trigger: TriggerConfig;
      action: RuleAction;
      cooldownSec: number;
    }>
  ) {
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.description !== undefined) data.description = input.description;
    if (input.enabled !== undefined) data.enabled = input.enabled;
    if (input.cooldownSec !== undefined) data.cooldownSec = input.cooldownSec;
    if (input.trigger !== undefined) data.trigger = JSON.stringify(input.trigger);
    if (input.action !== undefined) data.action = JSON.stringify(input.action);
    return db.automationRule.update({ where: { id }, data });
  }

  async toggleRule(id: string, enabled: boolean) {
    return db.automationRule.update({ where: { id }, data: { enabled } });
  }

  async deleteRule(id: string) {
    return db.automationRule.delete({ where: { id } });
  }

  /**
   * Evaluate + execute a single rule. Public so the API can trigger on-demand.
   */
  async evaluateAndExecute(ruleId: string): Promise<RuleExecutionResult> {
    const rule = await db.automationRule.findUnique({ where: { id: ruleId } });
    if (!rule) throw new Error(`Rule ${ruleId} not found`);
    if (!rule.enabled) {
      return {
        ruleId,
        ruleName: rule.name,
        fired: false,
      };
    }

    const trigger = JSON.parse(rule.trigger) as TriggerConfig;
    const action = JSON.parse(rule.action) as RuleAction;

    const intel = getIntelligenceService();
    const ctx = await intel.buildRuleContext(
      trigger.exchange,
      trigger.symbol,
      (trigger.timeframe as CandleInterval) ?? "1h"
    );

    const result = evaluateAll(trigger.conditions, ctx, trigger.matchMode);

    if (!result.matched) {
      return {
        ruleId,
        ruleName: rule.name,
        fired: false,
        context: ctx,
        evaluationNotes: result.notes,
        evaluationReasons: result.reasons,
      };
    }

    // Cooldown check
    if (
      rule.lastFiredAt &&
      Date.now() - rule.lastFiredAt.getTime() < rule.cooldownSec * 1000
    ) {
      return {
        ruleId,
        ruleName: rule.name,
        fired: false,
        context: ctx,
        evaluationNotes: result.notes,
        skippedDueToCooldown: true,
      };
    }

    // Execute action. Special-case place_order to route through adapter.
    let actionResult: ActionResult;
    if (action.type === "place_order") {
      actionResult = await this.executePlaceOrder(action, ctx);
    } else {
      actionResult = await executeAction(action, {
        trigger: { ruleId, ruleName: rule.name, ctx },
        signalNote: result.notes.join("; "),
      });
    }

    // Persist execution
    const exec = await db.ruleExecution.create({
      data: {
        ruleId,
        triggerSnapshot: JSON.stringify({
          ctx: { price: ctx.price, symbol: ctx.symbol, exchange: ctx.exchangeCode, timeframe: ctx.timeframe },
          notes: result.notes,
        }),
        actionResult: JSON.stringify(actionResult),
        status: actionResult.status === "error" ? "error" : "success",
      },
    });
    await db.automationRule.update({
      where: { id: ruleId },
      data: { lastFiredAt: new Date() },
    });

    return {
      ruleId,
      ruleName: rule.name,
      fired: true,
      context: ctx,
      evaluationNotes: result.notes,
      actionResult,
      firedAt: exec.firedAt,
    };
  }

  /**
   * Sweep all enabled rules. Returns one result per evaluated rule.
   * Designed to be called periodically (e.g. every 60s) by a cron-like task.
   */
  async sweep(): Promise<RuleExecutionResult[]> {
    const rules = await db.automationRule.findMany({ where: { enabled: true } });
    const results: RuleExecutionResult[] = [];
    for (const r of rules) {
      try {
        const res = await this.evaluateAndExecute(r.id);
        results.push(res);
      } catch (e: any) {
        results.push({
          ruleId: r.id,
          ruleName: r.name,
          fired: false,
          actionResult: {
            status: "error",
            detail: `evaluation failed: ${e.message}`,
          },
        });
      }
    }
    return results;
  }

  async listExecutions(ruleId?: string, limit: number = 50) {
    return db.ruleExecution.findMany({
      where: ruleId ? { ruleId } : undefined,
      orderBy: { firedAt: "desc" },
      take: limit,
      include: { rule: true },
    });
  }

  // ---- private ----

  private async executePlaceOrder(
    action: Extract<RuleAction, { type: "place_order" }>,
    ctx: RuleContext
  ): Promise<ActionResult> {
    if (process.env.ENABLE_LIVE_TRADING !== "true") {
      return {
        status: "skipped",
        detail:
          "live trading disabled (set ENABLE_LIVE_TRADING=true). Order not placed.",
      };
    }
    try {
      const adapter = getAdapter(action.exchange);
      const res = await adapter.placeOrder({
        symbol: action.symbol,
        side: action.side,
        type: action.orderType,
        quantity: action.quantity,
        price: action.price,
      });
      return {
        status: "success",
        detail: `order ${res.orderId} placed (${res.side} ${res.quantity} ${res.symbol})`,
        payload: res,
      };
    } catch (e: any) {
      return { status: "error", detail: `order failed: ${e.message}` };
    }
  }
}

// Singleton
let _instance: AutomationService | null = null;
export function getAutomationService(): AutomationService {
  if (!_instance) _instance = new AutomationService();
  return _instance;
}
