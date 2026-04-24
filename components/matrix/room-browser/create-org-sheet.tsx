"use client";

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
} from "@/components/ui/sheet";
import { useApiMutation } from "@/lib/hooks/use-api-mutation";
import type { RoomOrg } from "./types";

const createOrgSchema = z.object({
  name: z.string().min(1, "Org name is required"),
  homeserver: z.string().optional(),
  description: z.string().optional(),
});

type CreateOrgValues = z.infer<typeof createOrgSchema>;

interface CreateOrgSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (org: RoomOrg) => void;
}

export function CreateOrgSheet({
  open,
  onOpenChange,
  onCreated,
}: CreateOrgSheetProps) {
  const form = useForm<CreateOrgValues>({
    resolver: zodResolver(createOrgSchema),
    defaultValues: { name: "", homeserver: "", description: "" },
  });

  const { mutate, isPending, error } = useApiMutation<
    CreateOrgValues,
    { org: RoomOrg }
  >("/api/admin/matrix/orgs", {
    onSuccess: (data) => {
      toast.success(`Org "${form.getValues("name")}" created`);
      form.reset();
      onOpenChange(false);
      onCreated(data.org);
    },
  });

  function handleOpenChange(v: boolean) {
    if (!v) form.reset();
    onOpenChange(v);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>New Org</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) => mutate(values))}
            className="mt-4 space-y-4 px-4"
          >
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
                    <Input placeholder="Acme Corp" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="homeserver"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Homeserver</FormLabel>
                  <FormControl>
                    <Input placeholder="https://matrix.org" {...field} />
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
              {isPending ? "Creating..." : "Create Org"}
            </Button>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
