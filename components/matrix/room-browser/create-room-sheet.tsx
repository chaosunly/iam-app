"use client";

import { useEffect } from "react";
import { Plus } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useApiMutation } from "@/lib/hooks/use-api-mutation";
import type { RoomItem, RoomSpace } from "./types";

const createRoomSchema = z.object({
  name: z.string().min(1, "Room name is required"),
  spaceId: z.string().min(1, "Space is required"),
  matrixId: z.string().optional(),
  description: z.string().optional(),
});

type CreateRoomValues = z.infer<typeof createRoomSchema>;

interface CreateRoomSheetProps {
  spaces: RoomSpace[];
  defaultSpaceId?: string;
  onCreated: (room: RoomItem) => void;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}

export function CreateRoomSheet({
  spaces,
  defaultSpaceId,
  onCreated,
  open: controlledOpen,
  onOpenChange: onControlledOpenChange,
}: CreateRoomSheetProps) {
  const isControlled = controlledOpen !== undefined;

  const form = useForm<CreateRoomValues>({
    resolver: zodResolver(createRoomSchema),
    defaultValues: {
      name: "",
      spaceId: defaultSpaceId ?? "",
      matrixId: "",
      description: "",
    },
  });

  const { mutate, isPending, error, reset: resetError } = useApiMutation<
    CreateRoomValues,
    { room: RoomItem }
  >("/api/admin/matrix/rooms", {
    onSuccess: (data) => {
      toast.success(`Room "${form.getValues("name")}" created`);
      form.reset({ name: "", spaceId: defaultSpaceId ?? "", matrixId: "", description: "" });
      handleOpenChange(false);
      onCreated(data.room);
    },
  });

  useEffect(() => {
    if (isControlled && controlledOpen) {
      form.reset({ name: "", spaceId: defaultSpaceId ?? "", matrixId: "", description: "" });
      resetError();
    }
  }, [isControlled, controlledOpen, defaultSpaceId]);

  function handleOpenChange(v: boolean) {
    if (isControlled) onControlledOpenChange?.(v);
    else form.reset();
  }

  return (
    <Sheet
      open={isControlled ? controlledOpen : undefined}
      onOpenChange={handleOpenChange}
    >
      {!isControlled && (
        <SheetTrigger asChild>
          <Button size="sm" className="w-full gap-1.5">
            <Plus className="size-4" />
            Create Room
          </Button>
        </SheetTrigger>
      )}
      <SheetContent>
        <SheetHeader>
          <SheetTitle>New Room</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) => mutate(values))}
            className="mt-4 space-y-4 px-4"
          >
            <FormErrorAlert error={error} />

            <FormField
              control={form.control}
              name="spaceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Space <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a space" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {spaces.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.org ? `${s.org.name} / ` : ""}
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Name <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="general" {...field} />
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
                  <FormLabel>Element Room ID</FormLabel>
                  <FormControl>
                    <Input placeholder="!xyz456:matrix.org" {...field} />
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
              {isPending ? "Creating..." : "Create Room"}
            </Button>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
