import { get, set, del } from "idb-keyval";
import type { InventorySnapshot } from "@inventory/core";

const KEY = "inventory-analyzer:snapshot:v1";

export async function loadSnapshot(): Promise<InventorySnapshot | null> {
  const value = await get<InventorySnapshot>(KEY);
  return value ?? null;
}

export async function saveSnapshot(snapshot: InventorySnapshot): Promise<void> {
  await set(KEY, snapshot);
}

export async function clearSnapshot(): Promise<void> {
  await del(KEY);
}
