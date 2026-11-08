export type WorkspaceLead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  stage: string;
  notes: string;
  createdAt: string;
};
export type WorkspaceProduct = {
  id: string;
  name: string;
  description: string;
  type: string;
  price: number;
  currency: string;
  image: string;
  status: string;
};
export type WorkspaceService = {
  id: string;
  name: string;
  duration: number;
  description: string;
  active: boolean;
};
export type WorkspaceBooking = {
  id: string;
  serviceId: string;
  name: string;
  email: string;
  start: string;
  duration: number;
  status: string;
};
export type SiteElement = { id: string; type: string; text: string; image: string; href: string };
export type SitePage = {
  id: string;
  name: string;
  slug: string;
  title: string;
  description: string;
  elements: SiteElement[];
};
export type WorkspaceSite = { id: string; name: string; kind: string; pages: SitePage[] };
export const leadStages = ["New", "Contacted", "Qualified", "Won", "Lost"];
export function validWebUrl(value: string) {
  return !value || /^https?:\/\//i.test(value);
}
export function bookingOverlaps(
  bookings: WorkspaceBooking[],
  start: string,
  duration: number,
  ignoreId = "",
) {
  const begin = Date.parse(start),
    end = begin + duration * 60000;
  if (!Number.isFinite(begin) || duration <= 0) return true;
  return bookings.some(
    (item) =>
      item.id !== ignoreId &&
      item.status !== "Canceled" &&
      begin < Date.parse(item.start) + item.duration * 60000 &&
      end > Date.parse(item.start),
  );
}
export function workspaceMetrics(
  leads: WorkspaceLead[],
  bookings: WorkspaceBooking[],
  products: WorkspaceProduct[],
  since: number,
  successStages: string[] = ["Won"],
) {
  const current = leads.filter((item) => Date.parse(item.createdAt) >= since),
    appointments = bookings.filter(
      (item) => Date.parse(item.start) >= since && item.status !== "Canceled",
    );
  return {
    leads: current.length,
    qualified: current.filter((item) => item.stage === "Qualified").length,
    won: current.filter((item) => successStages.includes(item.stage)).length,
    bookings: appointments.length,
    products: products.filter((item) => item.status === "Active").length,
    conversion: current.length
      ? (current.filter((item) => successStages.includes(item.stage)).length / current.length) * 100
      : null,
  };
}
export function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-|-$/g, "") || "page"
  );
}
export function siteSeed(
  name: string,
  tagline: string,
  audience: string,
  ar: boolean,
  kind: string,
): WorkspaceSite {
  return {
    id: crypto.randomUUID(),
    name,
    kind,
    pages: [
      {
        id: crypto.randomUUID(),
        name: ar ? "الرئيسية" : "Home",
        slug: "home",
        title: name,
        description: tagline,
        elements: [
          { id: crypto.randomUUID(), type: "Heading", text: name, image: "", href: "" },
          { id: crypto.randomUUID(), type: "Text", text: tagline || audience, image: "", href: "" },
          {
            id: crypto.randomUUID(),
            type: "Button",
            text: ar ? "تواصل معنا" : "Get in touch",
            image: "",
            href: "",
          },
        ],
      },
    ],
  };
}

// Convert a wall-clock time to an instant using the selected IANA timezone.
// A round-trip rejects nonexistent daylight-saving times instead of silently moving them.
export function bookingInstant(date: string, time: string, zone: string) {
  const desired = Date.parse(`${date}T${time}:00Z`);
  if (!Number.isFinite(desired)) return null;
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    const parts = (at: number) =>
      Object.fromEntries(formatter.formatToParts(at).map((part) => [part.type, part.value]));
    let instant = desired;
    for (let n = 0; n < 4; n++) {
      const p = parts(instant);
      const wall = Date.parse(
        `${p["year"]}-${p["month"]}-${p["day"]}T${p["hour"]}:${p["minute"]}:${p["second"]}Z`,
      );
      const difference = desired - wall;
      if (!difference) break;
      instant += difference;
    }
    const p = parts(instant);
    if (`${p["year"]}-${p["month"]}-${p["day"]}` !== date || `${p["hour"]}:${p["minute"]}` !== time)
      return null;
    return new Date(instant).toISOString();
  } catch {
    return null;
  }
}
export function hasWorkspaceBookingConflict(bookings: WorkspaceBooking[]) {
  return bookings.some(
    (item, index) =>
      item.status !== "Canceled" &&
      bookingOverlaps(bookings.slice(index + 1), item.start, item.duration),
  );
}
