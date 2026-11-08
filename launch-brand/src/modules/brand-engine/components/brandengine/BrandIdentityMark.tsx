import type { BrandIdentity } from "@/modules/brand-engine/data/types";
import { brandPaletteColors } from "@/modules/brand-engine/data/brandPages";
import { createBrandMarkSvg, logoDataUrl } from "@/modules/brand-engine/services/brandLogo";

export function BrandIdentityMark({ identity, primary }: { identity: BrandIdentity; primary?: string | undefined }) {
  return <img className="generated-logo" src={logoDataUrl(createBrandMarkSvg(identity, primary ?? brandPaletteColors[identity.palette] ?? "#071B38"))} alt={`${identity.name} mark`} width={56} height={56} style={{ objectFit: "contain", background: "transparent", border: 0 }} />;
}
