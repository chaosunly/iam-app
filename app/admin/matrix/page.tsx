import { MatrixHubClient } from "./matrix-hub-client";

export default function MatrixHubPage() {
  const elementBaseUrl = (
    process.env.NEXT_PUBLIC_ELEMENT_URL ||
    process.env.ELEMENT_URL ||
    ""
  ).replace(/\/$/, "");

  const elementSsoUrl = elementBaseUrl
    ? `${elementBaseUrl}/element-logout?next=${encodeURIComponent(elementBaseUrl + "/#/login")}`
    : "";

  return <MatrixHubClient elementSsoUrl={elementSsoUrl} />;
}
