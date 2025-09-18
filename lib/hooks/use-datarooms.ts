"use client";

import { useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Dataroom } from "@/lib/types";
import { useUiStore } from "@/lib/store/ui";

export function useDatarooms(initialData?: Dataroom[]) {
  const qc = useQueryClient();
  const ensureDataroomSelection = useUiStore((s) => s.ensureDataroomSelection);

  const list = useQuery<Dataroom[]>({
    queryKey: ["datarooms"],
    queryFn: async () => {
      const res = await fetch("/api/datarooms/list");
      if (!res.ok) throw new Error("Failed to fetch datarooms");
      const data = await res.json();
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
        const e = await res.json();
        throw new Error(e.error || "Failed to create dataroom");
      }
      return (await res.json()) as Dataroom;
    },
    onSuccess: () => {
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
        const e = await res.json();
        throw new Error(e.error || "Failed to delete dataroom");
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
        const e = await res.json();
        throw new Error(e.error || "Failed to rename dataroom");
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
