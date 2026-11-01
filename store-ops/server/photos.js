import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { all, find, insert, update } from "./access.js";
import { CATALOG } from "./catalog.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const photoDir = path.join(root, "data", "store-photos");

export const PHOTOS = [
  { id: "ph-facade-day", file: "facade-day.png", label: "玻璃立面门头" },
  { id: "ph-facade-night", file: "facade-night.png", label: "灯箱立面夜景" },
  { id: "ph-mall-rope", file: "mall-rope.png", label: "商场门廊" },
  { id: "ph-mall-bears", file: "mall-bears.png", label: "橱窗与装置" },
  { id: "ph-interior-gold", file: "interior-gold.png", label: "金色墙面店内" },
  { id: "ph-interior-poodle", file: "interior-poodle.png", label: "蓝色装置店内" },
  { id: "ph-interior-lounge", file: "interior-lounge.png", label: "休息区店内" },
  { id: "ph-interior-marble", file: "interior-marble.png", label: "包袋陈列店内" },
];

const FEATURED = {
  "st-sanlitun": "ph-facade-night",
  "st-chengdu": "ph-facade-day",
  "st-taikoo": "ph-mall-bears",
  "st-mixc": "ph-mall-rope",
  "st-qiantan": "ph-interior-gold",
  "st-oriental": "ph-interior-marble",
};

export function photoIdsForCatalog(catalog = CATALOG) {
  const ids = [];
  for (let index = 0; index < catalog.length; index += 1) {
    let id = FEATURED[catalog[index].id] || PHOTOS[index % PHOTOS.length].id;
    if (ids[index - 1] === id) {
      const at = PHOTOS.findIndex((photo) => photo.id === id);
      id = PHOTOS[(at + 1) % PHOTOS.length].id;
    }
    ids.push(id);
  }
  return ids;
}

export function photoFile(photo) {
  return path.join(photoDir, photo.file);
}

function mimeOf(bytes) {
  const head = bytes.subarray(0, 12).toString("ascii");
  if (head.startsWith("RIFF") && head.slice(8, 12) === "WEBP") return "image/webp";
  return "image/png";
}

export async function ensurePhotos() {
  const existing = await all("store_photos");
  const byId = new Map(existing.map((row) => [row.id, row]));
  let added = 0;
  for (const photo of PHOTOS) {
    const bytes = fs.readFileSync(photoFile(photo));
    const mime = mimeOf(bytes);
    const row = byId.get(photo.id);
    if (!row) {
      await insert("store_photos", {
        id: photo.id,
        label: photo.label,
        mime,
        content: bytes.toString("base64"),
      });
      added += 1;
      continue;
    }
    if (row.mime !== mime || row.label !== photo.label) {
      await update("store_photos", photo.id, { mime, label: photo.label });
    }
  }
  const plannedList = photoIdsForCatalog();
  const planned = new Map(CATALOG.map((item, index) => [item.id, plannedList[index]]));
  const stores = await all("stores");
  let linked = 0;
  for (const store of stores) {
    if (store.photo_id) continue;
    const photoId = planned.get(store.id) || PHOTOS[linked % PHOTOS.length].id;
    await update("stores", store.id, { photo_id: photoId });
    linked += 1;
  }
  return { photos: PHOTOS.length, added, linked };
}

export async function readPhoto(id) {
  const rows = await find("store_photos", { id });
  const row = rows[0];
  if (!row?.content) return null;
  return {
    mime: row.mime || "image/png",
    label: row.label || "",
    body: Buffer.from(row.content, "base64"),
  };
}
