/** Full-page automation screens: the app serves only bots, under `/bots`. */
const BOTS_APP_HUB = "/bots"

export const STUDIO_ROUTES = {
  hub: BOTS_APP_HUB,
  newBot: `${BOTS_APP_HUB}/new`,
  bot: (id: string) => `${BOTS_APP_HUB}/${encodeURIComponent(id)}`,
}
