import { Separator } from "@/components/ui/separator";
import { Settings2 } from "lucide-react";

export default function GeneralSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">General</h2>
        <p className="text-sm text-muted-foreground">
          General account and application settings.
        </p>
      </div>

      <Separator />

      <div className="rounded-lg border border-dashed p-8 text-center">
        <Settings2 className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
        <p className="text-sm font-medium">General settings</p>
        <p className="text-xs text-muted-foreground mt-1">
          Additional settings will appear here.
        </p>
      </div>
    </div>
  );
}
