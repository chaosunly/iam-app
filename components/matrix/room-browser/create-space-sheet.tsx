"use client";

import { Layers } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormErrorAlert } from "@/components/ui/form-error-alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useApiMutation } from "@/lib/hooks/use-api-mutation";
import type { RoomSpace } from "./types";

const createSpaceSchema = z.object({
  name: z.string().min(1, "Space name is required"),
  matrixId: z.string().optional(),
  description: z.string().optional(),
});

type CreateSpaceValues = z.infer<typeof createSpaceSchema>;

interface CreateSpaceSheetProps {
  orgId: string;
  orgName: string;
  onCreated: (space: RoomSpace) => void;
}

export function CreateSpaceSheet({
  orgId,
  orgName,
  onCreated,
}: CreateSpaceSheetProps) {
  const form = useForm<CreateSpaceValues>({
    resolver: zodResolver(createSpaceSchema),
    defaultValues: { name: "", matrixId: "", description: "" },
  });

  const { mutate, isPending, error } = useApiMutation<
    CreateSpaceValues & { orgId: string },
    { space: RoomSpace }
  >("/api/admin/matrix/spaces", {
    onSuccess: (data) => {
      toast.success(`Space "${form.getValues("name")}" created`);
      form.reset();
      onCreated(data.space);
    },
  });

  return (
    <Sheet onOpenChange={(open) => { if (!open) form.reset(); }}>
      <SheetTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="w-full gap-1.5 border-dashed"
          disabled={!orgId}
        >
          <Layers className="size-4" />
          New Space
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>New Space</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) =>
              mutate({ ...values, orgId })
            )}
            className="mt-4 space-y-4 px-4"
          >
            <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
              Creating space in <strong>{orgName}</strong>
            </div>

            <FormErrorAlert error={error} />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Name <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="General" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="matrixId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Matrix Space ID</FormLabel>
                  <FormControl>
                    <Input placeholder="!abc:matrix.org" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? "Creating..." : "Create Space"}
            </Button>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
