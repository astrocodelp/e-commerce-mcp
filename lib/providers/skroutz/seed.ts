import { oldPriceOf, type Campaign, type Deal } from "../../types";
import { skroutzUrl } from "./parse";
// Bundled fallback: real deals pulled from Skroutz via the Skroutz Shopping connector on 2026-11-19.
// Shown (labelled "sample") only until the first successful live refresh.
const AT = "2026-11-19T15:00:00.000Z";
const d = (category: string, brand: string, title: string, sku_id: number, discountPct: number, price: number): Deal => ({
  id: `skroutz:${sku_id}`, source: "skroutz", nativeId: String(sku_id), sku_id, title: `${brand} ${title}`, brand, category, shop: null, price, discountPct, oldPrice: oldPriceOf(price, discountPct),
  baseline: "previous_price", url: skroutzUrl(sku_id), imageUrl: null, verify: `Skroutz Shopping connector: get_product(sku_id=${sku_id}) then add_to_cart`, fetchedAt: AT,
});
export const SKROUTZ_CAMPAIGNS: Campaign[] = [
  { id: "mission-30-off-60", source: "skroutz", title: "€30 off orders of €60+", description: "Skroutz-funded reward on a qualifying purchase (min order €60).", startsAt: "2026-11-16T18:30:00+02:00", endsAt: "2026-11-20T23:59:59+02:00" },
  { id: "interest-free-installments", source: "skroutz", title: "Interest-free installments", description: "3 installments from €60, 18 from €500, 36 from €800.", startsAt: "2026-11-13T00:00:00+02:00", endsAt: "2026-12-21T23:59:59+02:00" },
];
export const SKROUTZ_SEED = { updatedAt: AT, campaigns: SKROUTZ_CAMPAIGNS, deals: [
  d("smartphones", "Samsung", "Galaxy Z Fold7 5G 16/1TB Jet Black", 61574203, 2, 1969.92),
  d("smartphones", "Huawei", "Nova 14 Pro Dual SIM 12/512GB Crystal Blue", 65332710, 42, 416.9),
  d("smartphones", "Huawei", "Nova 14 Pro Dual SIM 12/512GB Black", 65113785, 37, 393.99),
  d("smartphones", "Xiaomi", "Redmi 17 4G Dual SIM 4/256GB Lotus Purple", 69052016, 10, 203.91),
  d("smartphones", "Apple", "iPhone 17 8/512GB Mist Blue", 62972982, 4, 1262),
  d("smartphones", "Apple", "iPhone 17 8/512GB Sage", 62972771, 5, 1279),
  d("smartphones", "Apple", "iPhone 17 Pro Max 12/2TB Deep Blue", 62970747, 7, 1863.93),
  d("smartphones", "Samsung", "Galaxy Z Fold8 Ultra 5G 12/256GB Cream", 68586357, 3, 1389.95),
  d("smartphones", "Samsung", "Galaxy Z Flip7 5G 12/256GB Coral Red", 61574207, 6, 802.86),
  d("audio", "Sony", "1000X The ColleXion Over Ear Platinum", 67426566, 20, 499),
  d("audio", "Sony", "WH-1000XM4C Over Ear Black", 69511676, 28, 185.9),
  d("audio", "Sony", "WH-1000XM6 Over Ear Midnight Blue", 60478236, 24, 329.99),
  d("audio", "Sony", "WH-1000XM6 Over Ear Sandstone", 67535712, 25, 308.97),
  d("audio", "Sony", "WH-CH530 On Ear Pink", 69621030, 28, 42),
  d("tv", "Xiaomi", "Smart TV 98\" 4K QD-Mini LED S (2026) ELA6600EU", 68656490, 22, 1699.99),
  d("tv", "Samsung", "Smart TV 55\" 4K OLED S90H (2026)", 67458387, 32, 1549),
  d("tv", "Samsung", "Smart TV 55\" 4K Crystal HU7000F (2025)", 65999037, 15, 509),
  d("tv", "Samsung", "Smart TV 75\" 4K Neo QLED The Frame Pro LS03F (2025)", 60483342, 22, 1499),
  d("tv", "Sony", "Smart TV 65\" 4K OLED Bravia 6 K-65A65 (2026)", 69410691, 37, 1249),
  d("tv", "Sony", "Smart TV 55\" 4K OLED Bravia 6 K-55A65 (2026)", 69411101, 44, 999),
  d("tv", "Xiaomi", "Smart TV 65\" 4K QLED A PRO (2026) ELA5990EU", 60981529, 11, 429.99),
  d("tv", "Xiaomi", "Smart TV 65\" 4K QD-Mini LED S (2026) ELA6594EU", 68853672, 21, 629.99),
  d("laptops", "Apple", "MacBook Air 15.3\" M5 24GB/1TB Midnight", 66585390, 3, 2279),
  d("laptops", "Apple", "MacBook Air 13.6\" M5 16GB/1TB Starlight (GR)", 65815232, 5, 1611.9),
  d("laptops", "Apple", "MacBook Pro 14.2\" M5 Pro 24GB/1TB Space Black", 66636751, 4, 3336.1),
  d("laptops", "Apple", "MacBook Pro 13.3\" M2 8GB/256GB Space Grey (GR)", 36451052, 13, 1299),
  d("smartwatches", "Xiaomi", "Watch 2 Pro Stainless Steel 48mm", 46378896, 24, 179.99),
  d("smartwatches", "Xiaomi", "Redmi Watch 5 Aluminium 48mm Lavender Purple", 58375326, 10, 84.9),
  d("smartwatches", "Apple", "Watch Ultra Titanium 49mm eSIM", 38235522, 30, 699),
  d("smartwatches", "Apple", "Watch Series 11 Cellular Titanium 46mm Gold", 62974632, 12, 975.82),
  d("smartwatches", "Apple", "Watch Series 11 Cellular Titanium 42mm Natural", 62974587, 10, 648.89),
  d("robot-vacuums", "Xiaomi", "Robot Vacuum 6 White 30000Pa", 69484973, 16, 549),
  d("robot-vacuums", "Xiaomi", "Robot Vacuum 6 Max Black 35000Pa", 69371170, 5, 849)
] as Deal[] };
