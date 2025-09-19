"use client";

import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

interface DataroomNameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string) => Promise<void>;
  title: string;
  description?: string;
  confirmLabel?: string;
  initialName?: string;
  autoFocus?: boolean;
}

const dataroomNameSchema = z.object({
  name: z.string().trim().min(1, "Please enter a name"),
});

export function DataroomNameDialog({
  open,
  onOpenChange,
  onSubmit,
  title,
  description,
  confirmLabel = "Save",
  initialName = "",
  autoFocus = true,
}: DataroomNameDialogProps) {
  const form = useForm<z.infer<typeof dataroomNameSchema>>({
    resolver: zodResolver(dataroomNameSchema),
    defaultValues: { name: initialName },
  });

  useEffect(() => {
    if (open) {
      form.reset({ name: initialName });
      form.clearErrors();
    }
  }, [open, initialName, form]);

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      form.reset({ name: initialName });
      form.clearErrors();
    }
    onOpenChange(nextOpen);
  };

  const submitHandler = form.handleSubmit(async (values) => {
    form.clearErrors("root");

    try {
      await onSubmit(values.name.trim());
      handleDialogOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Action failed";
      form.setError("root", { type: "manual", message });
    }
  });

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={submitHandler} className="space-y-3">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder="Dataroom name"
                      autoFocus={autoFocus}
                      disabled={form.formState.isSubmitting}
                      data-testid="input-dataroom-name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.formState.errors.root?.message ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.root.message}
              </p>
            ) : null}
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDialogOpenChange(false)}
                disabled={form.formState.isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving…" : confirmLabel}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
