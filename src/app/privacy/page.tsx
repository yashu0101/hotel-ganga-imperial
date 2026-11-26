import { canonical } from "@/lib/seo";
import Link from "next/link";
import InteriorShell from "@/components/InteriorShell";
export const metadata = {
  ...canonical("/privacy"),
  title: "Privacy | Hotel Ganga Imperial",
  description: "How Hotel Ganga Imperial uses the details you share in a reservation request.",
};
export default function Privacy() {
  return (
    <InteriorShell>
      <div className="wrap privacy-page">
        <Link className="back-inline" href="/">
          ← The hotel
        </Link>
        <h1>Your reservation details</h1>
        <p>
          The reservation form collects your name, phone number, optional email and the dates and preferences you
          submit. These details are stored so the hotel can review and respond to your request. If the hotel configures
          a notification delivery service, the request details are also sent to that service to handle staff alerts and
          guest acknowledgements.
        </p>
        <p>
          Submitting a request does not confirm a reservation or take a payment. Avoid including payment information or
          identity documents in your request.
        </p>
        <p>
          This site also stores your display preferences in your browser. For questions about your request or personal
          information, use the hotel contact details when available on the website.
        </p>
        <p>
          The hotel’s final privacy contact, retention period and configured service providers will be published before
          public launch.
        </p>
      </div>
    </InteriorShell>
  );
}
