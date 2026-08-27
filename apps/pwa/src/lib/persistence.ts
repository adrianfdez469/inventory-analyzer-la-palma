import { get, set, del } from "idb-keyval";
import type { InventorySnapshot } from "@inventory/core";

// v2: InventorySnapshot pasó a la forma multi-local (snapshot.locations[]). Se cambia la key
// para que un snapshot viejo (forma plana) simplemente no se lea más, en vez de romper la app.
const KEY = "inventory-analyzer:snapshot:v2";

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
