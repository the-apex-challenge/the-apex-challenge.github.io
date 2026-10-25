/** One portrait family for every Pixel puzzle. Same 256×256 source frame for all 28 Legends.
 * Local copies of the existing Fandom portrait fallbacks, as distributed by the
 * moeneri/astrbot_plugin_apexrankwatch asset catalog. Game artwork belongs to EA/Respawn.
 * Pixel never switches between these portraits and full-body/skin renders.
 */
export const PIXEL_PORTRAIT_SLUGS=Object.freeze(['alter','ash','axle','ballistic','bangalore','bloodhound','catalyst','caustic','conduit','crypto','fuse','gibraltar','horizon','lifeline','loba','mad-maggie','mirage','newcastle','octane','pathfinder','rampart','revenant','seer','sparrow','valkyrie','vantage','wattson','wraith']);
const supported=new Set(PIXEL_PORTRAIT_SLUGS);
export const pixelPortraitSources=slug=>supported.has(slug)?[`./assets/pixel-portraits/${slug}.png`]:[];
