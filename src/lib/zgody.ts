// Czy strona potrzebuje okienka zgód (decyzje 2C + 8C, 24.11.2026): tylko gdy jest GA4 albo widżety opinii.
// Jedno źródło dla okienka (BanerZgod) i przycisku „Ustawienia cookies” w stopce.
import { getEntry } from 'astro:content';

export async function ustawieniaZgod() {
  const seoG = (await getEntry('seoGlobalne', 'seo'))!.data;
  const ga4 = /^G-[A-Z0-9]{6,12}$/.test(seoG.ga4_id) ? seoG.ga4_id : '';
  const op = (await getEntry('opinieUstawienia', 'opinie'))!.data;
  const widzety = op.pokaz_segment && (!!(op.widzet_trustpilot.business_unit_id && op.widzet_trustpilot.template_id) || !!op.widzet_google.skrypt_url);
  return { ga4, widzety, potrzebne: !!ga4 || widzety };
}
