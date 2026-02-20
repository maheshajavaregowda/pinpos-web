/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as aggregatorMappings from "../aggregatorMappings.js";
import type * as aggregatorOrders from "../aggregatorOrders.js";
import type * as aggregators from "../aggregators.js";
import type * as auth from "../auth.js";
import type * as counters from "../counters.js";
import type * as crew from "../crew.js";
import type * as dashboard from "../dashboard.js";
import type * as devices from "../devices.js";
import type * as diningSections from "../diningSections.js";
import type * as http from "../http.js";
import type * as liveOrders from "../liveOrders.js";
import type * as menu from "../menu.js";
import type * as orders from "../orders.js";
import type * as seed from "../seed.js";
import type * as stores from "../stores.js";
import type * as subscription from "../subscription.js";
import type * as tables from "../tables.js";
import type * as testWebhooks from "../testWebhooks.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  aggregatorMappings: typeof aggregatorMappings;
  aggregatorOrders: typeof aggregatorOrders;
  aggregators: typeof aggregators;
  auth: typeof auth;
  counters: typeof counters;
  crew: typeof crew;
  dashboard: typeof dashboard;
  devices: typeof devices;
  diningSections: typeof diningSections;
  http: typeof http;
  liveOrders: typeof liveOrders;
  menu: typeof menu;
  orders: typeof orders;
  seed: typeof seed;
  stores: typeof stores;
  subscription: typeof subscription;
  tables: typeof tables;
  testWebhooks: typeof testWebhooks;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
