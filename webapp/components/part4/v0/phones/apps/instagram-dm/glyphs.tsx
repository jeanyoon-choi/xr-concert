// Verbatim IGDS icon geometry, copied from experiments-jyc SCC
// components/mobile/clone/11/screen/igds-extra.ts (Instagram's own icon modules,
// served by static.cdninstagram.com, fetched 2026-10-11). Never redrawn.

const line = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2 } as const;

export type DmGlyphName = "back" | "call" | "videoCall" | "camera" | "microphone" | "photo" | "sticker";

export function Glyph({ name, size = 24 }: { name: DmGlyphName; size?: number }) {
  const svg = { "aria-hidden": true as const, width: size, height: size, viewBox: "0 0 24 24", fill: "currentColor" };
  switch (name) {
    /** IGDSChevronLeftPanoOutlineIcon */
    case "back":
      return <svg {...svg}><polyline {...line} points="16.502 3 7.498 12 16.502 21" /></svg>;
    /** IGDSCallPanoOutline24Icon */
    case "call":
      return <svg {...svg}><path d="M18.227 22.912c-4.913 0-9.286-3.627-11.486-5.828C4.486 14.83.731 10.291.921 5.231a3.289 3.289 0 0 1 .908-2.138 17.116 17.116 0 0 1 1.865-1.71 2.307 2.307 0 0 1 3.004.174 13.283 13.283 0 0 1 3.658 5.325 2.551 2.551 0 0 1-.19 1.941l-.455.853a.463.463 0 0 0-.024.387 7.57 7.57 0 0 0 4.077 4.075.455.455 0 0 0 .386-.024l.853-.455a2.548 2.548 0 0 1 1.94-.19 13.278 13.278 0 0 1 5.326 3.658 2.309 2.309 0 0 1 .174 3.003 17.319 17.319 0 0 1-1.71 1.866 3.29 3.29 0 0 1-2.138.91 10.27 10.27 0 0 1-.368.006Zm-13.144-20a.27.27 0 0 0-.167.054A15.121 15.121 0 0 0 3.28 4.47a1.289 1.289 0 0 0-.36.836c-.161 4.301 3.21 8.34 5.235 10.364s6.06 5.403 10.366 5.236a1.284 1.284 0 0 0 .835-.36 15.217 15.217 0 0 0 1.504-1.637.324.324 0 0 0-.047-.41 11.62 11.62 0 0 0-4.457-3.119.545.545 0 0 0-.411.044l-.854.455a2.452 2.452 0 0 1-2.071.116 9.571 9.571 0 0 1-5.189-5.188 2.457 2.457 0 0 1 .115-2.071l.456-.855a.544.544 0 0 0 .043-.41 11.629 11.629 0 0 0-3.118-4.458.36.36 0 0 0-.244-.1Z" /></svg>;
    /** IGDSVideoChatPanoOutlineIcon */
    case "videoCall":
      return <svg {...svg}><rect {...line} height="18" rx="3" width="16.999" x="1" y="3" /><path {...line} d="m17.999 9.146 2.495-2.256A1.5 1.5 0 0 1 23 8.003v7.994a1.5 1.5 0 0 1-2.506 1.113L18 14.854" /></svg>;
    /** IGDSCameraPanoFilled24Svg */
    case "camera":
      return <svg {...svg}><path d="M12 9.652a3.54 3.54 0 1 0 3.54 3.539A3.543 3.543 0 0 0 12 9.65zm6.59-5.187h-.52a1.107 1.107 0 0 1-1.032-.762 3.103 3.103 0 0 0-3.127-1.961H10.09a3.103 3.103 0 0 0-3.127 1.96 1.107 1.107 0 0 1-1.032.763h-.52A4.414 4.414 0 0 0 1 8.874v9.092a4.413 4.413 0 0 0 4.408 4.408h13.184A4.413 4.413 0 0 0 23 17.966V8.874a4.414 4.414 0 0 0-4.41-4.41zM12 18.73a5.54 5.54 0 1 1 5.54-5.54A5.545 5.545 0 0 1 12 18.73z" /></svg>;
    /** IGDSMicrophonePanoOutline24Icon */
    case "microphone":
      return <svg {...svg}><path {...line} d="M19.5 10.671v.897a7.5 7.5 0 0 1-15 0v-.897" /><line {...line} strokeLinecap="butt" x1="12" x2="12" y1="19.068" y2="22" /><line {...line} x1="8.706" x2="15.104" y1="22" y2="22" /><path {...line} d="M12 15.745a4 4 0 0 1-4-4V6a4 4 0 0 1 8 0v5.745a4 4 0 0 1-4 4Z" /></svg>;
    /** IGDSPhotoPanoOutlineIcon */
    case "photo":
      return <svg {...svg}><path d="M6.549 5.013A1.557 1.557 0 1 0 8.106 6.57a1.557 1.557 0 0 0-1.557-1.557Z" fillRule="evenodd" /><path fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" d="m2 18.605 3.901-3.9a.908.908 0 0 1 1.284 0l2.807 2.806a.908.908 0 0 0 1.283 0l5.534-5.534a.908.908 0 0 1 1.283 0l3.905 3.905" /><path {...line} d="M18.44 2.004A3.56 3.56 0 0 1 22 5.564h0v12.873a3.56 3.56 0 0 1-3.56 3.56H5.568a3.56 3.56 0 0 1-3.56-3.56V5.563a3.56 3.56 0 0 1 3.56-3.56Z" /></svg>;
    /** IGDSStickerPanoOutline24Icon */
    case "sticker":
      return <svg {...svg}><path {...line} d="M13.11 22H7.416A5.417 5.417 0 0 1 2 16.583V7.417A5.417 5.417 0 0 1 7.417 2h9.166A5.417 5.417 0 0 1 22 7.417v5.836a2.083 2.083 0 0 1-.626 1.488l-6.808 6.664A2.083 2.083 0 0 1 13.11 22Z" /><circle cx="8.238" cy="9.943" r="1.335" /><circle cx="15.762" cy="9.943" r="1.335" /><path {...line} d="M15.174 15.23a4.887 4.887 0 0 1-6.937-.301" /><path {...line} d="M22 10.833v1.629a1.25 1.25 0 0 1-1.25 1.25h-1.79a5.417 5.417 0 0 0-5.417 5.417v1.62a1.25 1.25 0 0 1-1.25 1.25H9.897" /></svg>;
  }
}
