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
import { useApiMutation } from "@/lib/hooks/use-api-mutation";

const identitySchema = z.object({
  email: z.string().email({ message: "Enter a valid email address" }),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type IdentityFormValues = z.infer<typeof identitySchema>;

interface CreateIdentityBody {
  schema_id: string;
  traits: { email: string; name: { first?: string; last?: string } };
  credentials: { password: { config: { password: string } } };
}

export default function NewIdentityPage() {
  const router = useRouter();

  const form = useForm<IdentityFormValues>({
    resolver: zodResolver(identitySchema),
    defaultValues: { email: "", firstName: "", lastName: "", password: "" },
  });

  const { mutate, isPending, error } = useApiMutation<
    CreateIdentityBody,
    { data?: { id: string }; id?: string }
  >("/api/admin/identities", {
    onSuccess: (result) => {
      toast.success("Identity created");
      const identity = result.data ?? result;
      router.push(`/admin/identities/${identity.id}`);
    },
  });

  function onSubmit(values: IdentityFormValues) {
    mutate({
      schema_id: "default",
      traits: {
        email: values.email,
        name: {
          first: values.firstName || undefined,
          last: values.lastName || undefined,
        },
      },
      credentials: {
        password: { config: { password: values.password } },
      },
    });
  }

  return (
    <div className="max-w-2xl p-6 md:p-8">
      <div className="mb-8">
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
          <Link href="/admin/identities">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to Identities
          </Link>
        </Button>
        <h2 className="mb-2 text-3xl font-bold">Create New Identity</h2>
        <p className="text-muted-foreground">Add a new user to the system</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormErrorAlert error={error} />

          <div className="rounded-lg border p-6 space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Email <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="user@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Password <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Minimum 8 characters" {...field} />
                  </FormControl>
                  <FormDescription>
                    The user will be able to change this password later.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating..." : "Create Identity"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
