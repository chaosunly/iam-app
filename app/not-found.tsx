import { ErrorPage } from "@/components/ui/error-page";

export default function NotFound() {
  return (
    <ErrorPage
      title="Page not found"
      message="The page you're looking for doesn't exist or has been moved."
      showHomeButton
    />
  );
}
