import { unstable_cache } from "next/cache";
import { getDb } from "./mongodb";

export interface SettingDocument {
  key: string;
  value?: unknown;
  available?: boolean;
  updatedAt: Date;
}

/**
 * Returns the MongoDB `settings` collection.
 */
export async function getSettingsCollection() {
  const db = await getDb();
  const collection = db.collection<SettingDocument>("settings");
  await collection.createIndex({ key: 1 }, { unique: true }).catch(() => {});
  return collection;
}

/**
 * Retrieves the global "Available for work" status.
 * Defaults to `true` if not yet configured or if DB is unreachable.
 */
export async function getAvailabilityStatus(): Promise<boolean> {
  try {
    const col = await getSettingsCollection();
    const doc = await col.findOne({ key: "availability" });
    if (doc && typeof doc.available === "boolean") {
      return doc.available;
    }
    return true; // Default to available
  } catch (error) {
    console.error("Failed to fetch availability status from MongoDB:", error);
    return true;
  }
}

/**
 * Cached version of getAvailabilityStatus with 1-hour fallback TTL.
 */
export const getCachedAvailabilityStatus = unstable_cache(
  async () => getAvailabilityStatus(),
  ["availability-status"],
  {
    tags: ["settings", "availability"],
    revalidate: 3600,
  }
);

/**
 * Sets the global "Available for work" status.
 */
export async function setAvailabilityStatus(available: boolean): Promise<boolean> {
  const col = await getSettingsCollection();
  await col.updateOne(
    { key: "availability" },
    {
      $set: {
        key: "availability",
        available,
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );
  return available;
}

/**
 * Inverts the current "Available for work" status.
 */
export async function toggleAvailabilityStatus(): Promise<boolean> {
  const current = await getAvailabilityStatus();
  const next = !current;
  return setAvailabilityStatus(next);
}
