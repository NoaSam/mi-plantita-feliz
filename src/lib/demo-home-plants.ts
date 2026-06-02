import type { HomePlant } from "@/hooks/use-home-plants";

const DAY_MS = 86_400_000;

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

export function getDemoHomePlants(): HomePlant[] {
  return [
    {
      id: "demo-overdue",
      name: "Ficus elastica (Ficus elastica)",
      imageUrl:
        "https://images.unsplash.com/photo-1604762524889-3e2fcc145683?w=200&q=80",
      createdAt: "2026-04-01T10:00:00Z",
      wateringIntervalDays: 7,
      lastWateredAt: isoDaysAgo(12),
    },
    {
      id: "demo-no-freq",
      name: "Begonia maculata",
      imageUrl:
        "https://images.unsplash.com/photo-1632207691143-643e2a9a9361?w=200&q=80",
      createdAt: "2026-05-15T10:00:00Z",
      wateringIntervalDays: null,
      lastWateredAt: null,
    },
    {
      id: "demo-urgent",
      name: "Pothos dorado (Epipremnum aureum)",
      imageUrl:
        "https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=200&q=80",
      createdAt: "2026-04-15T10:00:00Z",
      wateringIntervalDays: 10,
      lastWateredAt: isoDaysAgo(10),
    },
    {
      id: "demo-normal",
      name: "Monstera deliciosa",
      imageUrl:
        "https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=200&q=80",
      createdAt: "2026-05-10T10:00:00Z",
      wateringIntervalDays: 7,
      lastWateredAt: isoDaysAgo(3),
    },
    {
      id: "demo-pending-ia",
      name: "Aloe vera",
      imageUrl:
        "https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=200&q=80",
      createdAt: "2026-05-16T10:00:00Z",
      wateringIntervalDays: 14,
      lastWateredAt: null,
    },
  ];
}
