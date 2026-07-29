import "server-only";
import QRCode from "qrcode";
import { APP_URL } from "@/lib/env";

/** The URL a printed sticker's QR code encodes -- lands on the check-in page for that code. */
export function checkinUrl(qrCodeId: string): string {
  return `${APP_URL}/checkin/${qrCodeId}`;
}

/** Rendered fully server-side, no external QR service -- printable codes never leave the platform. */
export async function checkinQrSvg(qrCodeId: string): Promise<string> {
  return QRCode.toString(checkinUrl(qrCodeId), {
    type: "svg",
    margin: 1,
    width: 160,
  });
}
