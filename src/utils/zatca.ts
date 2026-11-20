import QRCode from 'qrcode';

function encodeTlvTag(tag: number, value: string): Uint8Array {
  const encoder = new TextEncoder();
  const valueBytes = encoder.encode(value);
  const tlv = new Uint8Array(2 + valueBytes.length);
  tlv[0] = tag;
  tlv[1] = valueBytes.length;
  tlv.set(valueBytes, 2);
  return tlv;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Generates an official ZATCA Phase 1 / Phase 2 TLV Base64 string:
 * Tag 1: Seller Name
 * Tag 2: VAT Registration Number (15 digits)
 * Tag 3: Timestamp (ISO 8601)
 * Tag 4: Invoice Total (with VAT)
 * Tag 5: VAT Total
 */
export function buildZatcaTlvBase64(params: {
  sellerName: string;
  vatNumber: string;
  timestampIso: string;
  invoiceTotalSar: string;
  vatTotalSar: string;
}): string {
  const parts = [
    encodeTlvTag(1, params.sellerName),
    encodeTlvTag(2, params.vatNumber),
    encodeTlvTag(3, params.timestampIso),
    encodeTlvTag(4, params.invoiceTotalSar),
    encodeTlvTag(5, params.vatTotalSar),
  ];

  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    combined.set(part, offset);
    offset += part.length;
  }

  return uint8ArrayToBase64(combined);
}

export const QAWAEM_SELLER_INFO = {
  name: 'شركة منصة قوائم برو للتقنية المالية المحدودة',
  vatNumber: '310998877600003',
  crNumber: '1010998877',
  nationalAddress: 'طريق الملك فهد، حي العليا، الرياض 12214، المملكة العربية السعودية',
} as const;

export interface DecodedZatcaTag {
  tag: number;
  label: string;
  value: string;
}

export function decodeZatcaTlvBase64(tlvBase64: string): DecodedZatcaTag[] {
  if (!tlvBase64) return [];
  try {
    const binary = atob(tlvBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }

    const decoder = new TextDecoder();
    const tagLabels: Record<number, string> = {
      1: 'اسم المورد (Tag 1)',
      2: 'الرقم الضريبي للمورد (Tag 2)',
      3: 'الطابع الزمني ISO 8601 (Tag 3)',
      4: 'إجمالي الفاتورة شامل الضريبة (Tag 4)',
      5: 'مجموع ضريبة القيمة المضافة (Tag 5)',
    };

    const result: DecodedZatcaTag[] = [];
    let offset = 0;
    while (offset + 2 <= bytes.length) {
      const tag = bytes[offset];
      const len = bytes[offset + 1];
      offset += 2;
      if (offset + len > bytes.length) break;
      const value = decoder.decode(bytes.slice(offset, offset + len));
      offset += len;
      result.push({
        tag,
        label: tagLabels[tag] || `وسم (${tag})`,
        value,
      });
    }
    return result;
  } catch {
    return [];
  }
}

export async function generateZatcaQrImage(tlvBase64: string): Promise<string> {
  return QRCode.toDataURL(tlvBase64, {
    width: 180,
    margin: 1,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });
}
