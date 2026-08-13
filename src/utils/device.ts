export type DeviceType = "desktop" | "mobile" | "tablet";

export function describeDevice(userAgent: string): {
  device_type: DeviceType;
  label: string;
} {
  const ua = userAgent || "";
  const isTablet = /iPad|Tablet|PlayBook/i.test(ua);
  const isMobile = !isTablet && /Mobile|Android|iPhone|iPod/i.test(ua);
  const device_type: DeviceType = isTablet
    ? "tablet"
    : isMobile
      ? "mobile"
      : "desktop";

  let browser = "Navigateur";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/OPR\/|Opera/i.test(ua)) browser = "Opera";
  else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = "Chrome";
  else if (/Firefox\//i.test(ua) || /FxiOS/i.test(ua)) browser = "Firefox";
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";

  let os = "";
  if (/Windows/i.test(ua)) os = "Windows";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Mac OS X/i.test(ua)) os = "macOS";
  else if (/Linux/i.test(ua)) os = "Linux";

  return {
    device_type,
    label: os ? `${browser} sur ${os}` : browser,
  };
}
