import greenBody from "@assets/mascot/green-body.webp";
import greenIris from "@assets/mascot/green-iris.webp";
import redBody from "@assets/mascot/red-body.webp";
import redIris from "@assets/mascot/red-iris.webp";
import purpleBody from "@assets/mascot/purple-body.webp";
import purpleIris from "@assets/mascot/purple-iris.webp";
import yellowBody from "@assets/mascot/yellow-body.webp";
import yellowIris from "@assets/mascot/yellow-iris.webp";
import type { MascotColor } from "./family";

export const MASCOT_ART: Record<MascotColor, { body: ImageMetadata; iris: ImageMetadata }> = {
  green: { body: greenBody, iris: greenIris },
  red: { body: redBody, iris: redIris },
  purple: { body: purpleBody, iris: purpleIris },
  yellow: { body: yellowBody, iris: yellowIris },
};
