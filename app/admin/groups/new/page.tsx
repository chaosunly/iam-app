"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormErrorAlert } from "@/components/ui/form-error-alert";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useApiMutation } from "@/lib/hooks/use-api-mutation";

const groupSchema = z.object({
  name: z.string().min(1, "Group name is required"),
  description: z
    .string()
    .max(500, "Description must be 500 characters or fewer")
    .optional(),
});

type GroupFormValues = z.infer<typeof groupSchema>;

export default function NewGroupPage() {
  const router = useRouter();

  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupSchema),
    defaultValues: { name: "", description: "" },
  });

  const { mutate, isPending, error } = useApiMutation<
    GroupFormValues,
    { id: string }
  >("/api/admin/groups", {
    onSuccess: (data) => {
      toast.success("Group created");
      router.push(`/admin/groups/${data.id}`);
    },
  });

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
          <Link href="/admin/groups">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to Groups
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Create New Group</h1>
        <p className="mt-1 text-muted-foreground">
          Create a new group to organize users
        </p>
      </div>

      <div className="max-w-2xl">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) => mutate(values))}
            className="space-y-6"
          >
            <FormErrorAlert error={error} />

            <div className="rounded-lg border p-6 space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Group Name <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Engineering Team" {...field} />
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
                      <Textarea
                        placeholder="Describe the purpose of this group..."
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>Optional. Max 500 characters.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" asChild>
                <Link href="/admin/groups">Cancel</Link>
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Creating..." : "Create Group"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
