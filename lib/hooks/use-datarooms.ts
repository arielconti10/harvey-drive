"use client";

import { useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Dataroom } from "@/lib/types";
import { useUiStore } from "@/lib/store/ui";

async function getErrorMessage(response: Response, fallback: string) {
  const message = fallback;
  try {
    const raw = await response.text();
    const trimmed = raw.trim();
    if (!trimmed) {
      return message;
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === "object" && parsed !== null) {
        const candidate = parsed as Record<string, unknown>;
        const error = candidate.error;
        if (typeof error === "string" && error.trim()) {
          return error.trim();
        }
        const msg = candidate.message;
        if (typeof msg === "string" && msg.trim()) {
          return msg.trim();
        }
      } else if (typeof parsed === "string" && parsed.trim()) {
        return parsed.trim();
      }
    } catch {
      // not JSON, fall through to trimmed text
    }
    return trimmed;
  } catch {
    // ignore read errors
  }
  return message;
}

export function useDatarooms(initialData?: Dataroom[]) {
  const qc = useQueryClient();
  const ensureDataroomSelection = useUiStore((s) => s.ensureDataroomSelection);

  const list = useQuery<Dataroom[]>({
    queryKey: ["datarooms"],
    queryFn: async () => {
      const res = await fetch("/api/datarooms/list");
      if (!res.ok) {
        const message = await getErrorMessage(res, "Failed to fetch datarooms");
        throw new Error(message);
      }
      const data = (await res.json()) as { datarooms?: Dataroom[] };
      return data.datarooms ?? [];
    },
    staleTime: 30_000,
    initialData,
  });

  const create = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch("/api/datarooms/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const message = await getErrorMessage(res, "Failed to create dataroom");
        throw new Error(message);
      }
      return (await res.json()) as Dataroom;
    },
    onSuccess: (created) => {
      qc.setQueryData<Dataroom[]>(["datarooms"], (previous = []) => {
        const exists = previous.some((room) => room.id === created.id);
        return exists ? previous : [...previous, created];
      });
      qc.invalidateQueries({ queryKey: ["datarooms"] });
    },
  });

  const remove = useMutation({
    mutationFn: async (dataroomId: string) => {
      const res = await fetch("/api/datarooms/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataroomId }),
      });
      if (!res.ok) {
        const message = await getErrorMessage(res, "Failed to delete dataroom");
        throw new Error(message);
      }
      return true;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["datarooms"] });
    },
  });

  const rename = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const res = await fetch("/api/datarooms/rename", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataroomId: id, name }),
      });
      if (!res.ok) {
        const message = await getErrorMessage(res, "Failed to rename dataroom");
        throw new Error(message);
      }
      return (await res.json()) as Dataroom;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["datarooms"] });
    },
  });

  const dataroomIds = useMemo(
    () => (list.data ?? []).map((room) => room.id),
    [list.data]
  );

  useEffect(() => {
    ensureDataroomSelection(dataroomIds);
  }, [ensureDataroomSelection, dataroomIds]);

  return {
    datarooms: list.data ?? [],
    loading: list.isLoading,
    error: (list.error as Error | undefined)?.message || null,
    refetch: () => list.refetch(),
    create: (name: string) => create.mutateAsync(name),
    remove: (id: string) => remove.mutateAsync(id),
    rename: (id: string, name: string) => rename.mutateAsync({ id, name }),
  };
}
