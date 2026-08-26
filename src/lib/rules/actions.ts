/**
 * Proxigrid — Rule actions
 *
 * What happens when a rule fires. Initially safe (log + webhook only).
 * Trading actions are scaffolded but disabled by default — must be opted in
 * via ENABLE_LIVE_TRADING env flag.
 */

export type ActionType = "notify" | "webhook" | "place_order";

export interface BaseAction {
  type: ActionType;
}

export interface NotifyAction extends BaseAction {
  type: "notify";
  channel: "log" | "in_app";
  message?: string;
}

export interface WebhookAction extends BaseAction {
  type: "webhook";
  url: string;
  method?: "POST" | "GET";
  headers?: Record<string, string>;
  bodyTemplate?: string; // {{signal}} placeholders
}

export interface PlaceOrderAction extends BaseAction {
  type: "place_order";
  exchange: string;
  symbol: string;
  side: "buy" | "sell";
  orderType: "market" | "limit";
  quantity: number;
  price?: number;
}

export type RuleAction = NotifyAction | WebhookAction | PlaceOrderAction;

export interface ActionResult {
  status: "success" | "error" | "skipped";
  detail: string;
  payload?: unknown;
}

export async function executeAction(
  action: RuleAction,
  context: { trigger: Record<string, unknown>; signalNote?: string }
): Promise<ActionResult> {
  switch (action.type) {
    case "notify": {
      const msg =
        action.message ??
        `Proxigrid signal: ${context.signalNote ?? "rule fired"}`;
      if (action.channel === "log") {
        console.log(`[Proxigrid/notify] ${msg}`);
      }
      // in_app persistence is handled by AutomationService (write to DB)
      return {
        status: "success",
        detail: `notify via ${action.channel}`,
        payload: { message: msg },
      };
    }

    case "webhook": {
      try {
        const body = action.bodyTemplate
          ? action.bodyTemplate
              .replace(/\{\{signal\}\}/g, context.signalNote ?? "")
              .replace(/\{\{trigger\}\}/g, JSON.stringify(context.trigger))
          : JSON.stringify(context.trigger);
        const res = await fetch(action.url, {
          method: action.method ?? "POST",
          headers: {
            "Content-Type": "application/json",
            ...(action.headers ?? {}),
          },
          body: action.method === "GET" ? undefined : body,
        });
        if (!res.ok) {
          return {
            status: "error",
            detail: `webhook returned ${res.status}`,
            payload: { status: res.status },
          };
        }
        return {
          status: "success",
          detail: `webhook ${action.method ?? "POST"} ${action.url}`,
          payload: { httpStatus: res.status },
        };
      } catch (e: any) {
        return { status: "error", detail: `webhook failed: ${e.message}` };
      }
    }

    case "place_order": {
      if (process.env.ENABLE_LIVE_TRADING !== "true") {
        return {
          status: "skipped",
          detail:
            "live trading disabled (set ENABLE_LIVE_TRADING=true to enable). Order not placed.",
        };
      }
      // Order placement is wired via AutomationService (which has access to registry).
      // Returning a sentinel — the service will override this.
      return {
        status: "skipped",
        detail: "place_order must be executed by AutomationService",
      };
    }

    default: {
      return { status: "error", detail: `unknown action type` };
    }
  }
}
