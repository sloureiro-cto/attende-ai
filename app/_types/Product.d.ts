/** Catalog recurrence and card line recurrence (API). */
export type ProductRecurrence = "onetime" | "weekly" | "monthly" | "annually"

export interface IDiscount {
  type: "percentage" | "amount"
  /** percentage: 0..100; amount: integer cents */
  value: number
}

/** Line item on a card (API `cardProducts[]`). */
export interface ICardProduct {
  /** Mongo ObjectId of catalog product when linked */
  product?: string
  titleSnapshot: string
  quantity: number
  recurrence: ProductRecurrence
  /** Unit price, integer cents */
  price: number
  discount?: IDiscount
  variant_id?: string
  sku_snapshot?: string
  card_product_key?: string
  unit_ids?: string[]
  rental_start?: string
  rental_end?: string
}

/** Product catalog row (`GET/POST .../products`). */
export type ProductPhysicality = "physical" | "digital"
export type ProductFulfillment = "sale" | "rental"
export type ProductScope = "board" | "project" | "workspace"

export interface IProductMedia {
  _id: string
  url: string
  kind: "image" | "video"
  order: number
  is_cover: boolean
  variant_id?: string
}

export type ProductPriceBookMode = "unit" | "flat" | "ranges" | "base_plus_additional"

export interface IProductPriceBookRange {
  from_qty: number
  to_qty?: number
  unit_price_cents: number
  pricing?: "unit" | "flat"
}

export interface IProductPriceBook {
  _id?: string
  mode: ProductPriceBookMode
  unit_price_cents?: number
  flat_price_cents?: number
  ranges?: IProductPriceBookRange[]
  /** `all`: the whole quantity at the band reached; `progressive`: each band on its own. */
  tier_apply?: "all" | "progressive"
  base_plus_additional?: {
    included_qty: number
    included_unit_price_cents: number
    additional_unit_price_cents: number
  }
  variant_id?: string
}

export interface IProductCategory {
  _id: string
  name: string
  parent_id?: string
}

export interface IProductVariant {
  _id?: string
  attributes: { name: string; value: string }[]
  sku?: string
  active?: boolean
  on_hand?: number
  price_book_id?: string
  price_book?: IProductPriceBook
  barcode?: string
  /** Own rental table; the product's applies when absent. */
  rental?: IProductRentalTable
  field_values?: Record<string, ProductFieldValue>
}

export interface IProductSeasonalPrice {
  _id?: string
  start: string | Date
  end: string | Date
  timezone: string
  unit_price_cents?: number
  price_book_id?: string
  updated_at?: string | Date
}

export interface IProductPriceHistory {
  _id: string
  at: string | Date
  field: "defaultPrice" | "price_book" | "seasonal"
  from?: unknown
  to?: unknown
  actor_id?: string
}

export type ProductAvailability =
  | { track: false }
  | { track: true; on_hand: number; available: number; sufficient?: boolean }

export type ProductInventoryMode = "off" | "pool" | "serialized"

export type InventoryUnitStatus =
  | "available"
  | "reserved"
  | "rented"
  | "maintenance"
  | "damaged"
  | "sold"
  | "lost"
  | "inactive"

export interface IProductInventoryUnitPurchase {
  date?: string | Date
  amount_cents?: number
  supplier?: string
  /** Proof of purchase: a file saved in the Library. */
  receipt?: { document_id: string; name?: string; url?: string; mime_type?: string }
}

/** The negotiation a unit is tied to: out on a rental (now or upcoming), or sold. */
export interface IUnitDeal {
  card_id: string
  card_title: string
  card_slug?: string
  project_id?: string
  kind: "rental" | "sale"
  start?: string | Date
  end?: string | Date
  /** The rental is happening now (as opposed to an upcoming one). */
  current?: boolean
}

export interface IProductInventoryUnit {
  _id: string
  serial: string
  status: InventoryUnitStatus | string
  location?: string
  variant_id?: string
  barcode?: string
  note?: string
  purchase?: IProductInventoryUnitPurchase
  field_values?: Record<string, ProductFieldValue>
  deal?: IUnitDeal
}

export interface IProductStockLedger {
  _id: string
  delta: number
  reason: string
  note?: string
  created_at: string | Date
  card_id?: string
}

export interface IProductReservation {
  _id: string
  card_id: string
  card_product_key: string
  card_title?: string
  variant_id?: string
  quantity: number
  unit_ids?: string[]
  start: string | Date
  end: string | Date
  status: string
}

export interface IProductInventory {
  mode: ProductInventoryMode
  on_hand: number
  /** Units per status; present whenever the product has units, also in list rows. */
  unit_counts?: Record<string, number>
  units?: IProductInventoryUnit[]
  ledger?: IProductStockLedger[]
  reservations?: IProductReservation[]
}

export interface IProductStats {
  sold_quantity: number
  sold_count: number
  rental_days: number
  revenue_cents: number
}

/**
 * Generic external-integration field (backend-managed, not user-editable) —
 * e.g. { fieldId: "booqableProductId", value: "abc123" } when this catalog
 * entry was synced from Booqable. Same shape as a Card's customFields.
 */
export interface IProductCustomField {
  fieldId: string
  fieldName: string
  fieldType: "text" | "number" | "date" | "select" | "multiselect" | "boolean" | "email" | "url" | "currency"
  value: string | number | boolean | null
}

export type ProductFieldValue = string | number | boolean | null

/** Rental price table, integer cents per period. */
export interface IProductRentalTable {
  daily_cents: number
  weekly_cents?: number
  monthly_cents?: number
}

export interface IProductRental extends IProductRentalTable {
  /** Refundable security deposit per unit. */
  deposit_cents?: number
}

export interface IPriceRuleRepeat {
  unit: "week" | "month" | "year"
  every: number
}

/**
 * A special price. `period`: between two dates (optionally repeating) the price changes, either by a
 * percentage or to its own prices. `long_rental`: rentals of at least `min_days` get a percentage.
 */
export interface IProductPriceRule {
  kind: "period" | "long_rental"
  label?: string
  /** period: first window, YYYY-MM-DD, inclusive. */
  start?: string
  end?: string
  /** period: how the window comes back; absent means it does not repeat. */
  repeat?: IPriceRuleRepeat
  /** Signed percentage: +20 is 20% more, -15 is 15% less. */
  percent?: number
  /** period: different prices for the window. */
  price_book?: IProductPriceBook
  rental?: IProductRentalTable
  min_days?: number
}

export interface IProductDelivery {
  kind: "link" | "file" | "license"
  value?: string
}

export type ProductFieldLevel = "product" | "variant" | "unit"

export interface IProductFieldLink {
  field_id: string
  level: ProductFieldLevel
  on_proposal: boolean
}

export type ProductFieldType = "text" | "number" | "date" | "boolean" | "select"

/** Extra field created once per workspace and turned on product by product. */
export interface IProductFieldDefinition {
  _id: string
  name: string
  type: ProductFieldType
  options?: string[]
}

export type MaintenanceKind = "preventive" | "corrective" | "damage"
export type MaintenanceStatus = "open" | "done"

export interface IProductMaintenance {
  _id: string
  unit_id: string
  unit_serial?: string
  title: string
  kind: MaintenanceKind
  status: MaintenanceStatus
  start: string | Date
  end?: string | Date
  cost_cents: number
  note?: string
}

export type AgendaStage = "open" | "reserved" | "rented" | "done"

export interface IProductAgendaDay {
  date: string
  free: number
  total: number
}

export interface IProductAgendaBooking {
  card_id: string
  card_slug?: string
  card_title: string
  project_id: string
  project_title?: string
  unit_ids: string[]
  quantity: number
  start: string | Date
  end: string | Date
  value_cents: number
  stage: AgendaStage
}

export interface IProductAgenda {
  days: IProductAgendaDay[]
  bookings: IProductAgendaBooking[]
  maintenance: Array<{
    maintenance_id: string
    unit_id: string
    unit_serial?: string
    title: string
    start: string | Date
    end?: string | Date
  }>
}

export interface IProductUnitInsight {
  unit_id: string
  serial: string
  paid_cents: number
  maintenance_cents: number
  revenue_cents: number
  roi: number | null
  rented_days: number
  recent: Array<{ card_id: string; card_title: string; start: string | Date; end: string | Date; value_cents: number }>
}

export interface IProductInsights {
  units: IProductUnitInsight[]
  totals: { paid_cents: number; maintenance_cents: number; revenue_cents: number; roi: number | null }
  purchases: Array<{
    unit_id: string
    serial: string
    date?: string | Date
    amount_cents: number
    supplier?: string
    receipt?: { document_id: string; name?: string; url?: string; mime_type?: string }
  }>
  sale: { cost_cents: number | null; entries: Array<{ at: string | Date; quantity: number; note?: string }> }
}

export interface IProductSharedBoards {
  project: string
  board_ids: string[]
}

export interface IProduct {
  _id?: string
  workspace?: string
  project?: string
  title: string
  description?: string
  description_rich?: Record<string, unknown> | unknown[]
  media?: IProductMedia[]
  sku?: string
  type?: string
  physicality?: ProductPhysicality
  fulfillment?: ProductFulfillment
  scope?: ProductScope
  board_id?: string
  /** With scope "board": the boards of the home project where the product is offered. */
  board_ids?: string[]
  /** Other projects whose whole catalog picker (every board) also lists this product. */
  shared_project_ids?: string[]
  /** Specific boards of other projects where the product is also offered. */
  shared_boards?: IProductSharedBoards[]
  /** ISO 4217 */
  currency?: string
  hasStockControl?: boolean
  stock?: number
  defaultPrice: number
  defaultRecurrence: ProductRecurrence
  /** S3 URLs, in upload order. */
  images?: string[]
  /** Must be one of `images` (or unset) — the photo shown as the product's thumbnail. */
  coverImageUrl?: string | null
  /** Set when this catalog entry is linked to an RD Station product (backend-managed, not user-editable). */
  rdStationProductId?: string
  /** Generic external-integration fields — see {@link IProductCustomField}. Backend-managed, not user-editable. */
  customFields?: IProductCustomField[]
  active?: boolean
  deleted?: boolean
  createdAt?: string | Date
  updatedAt?: string | Date
  variants?: IProductVariant[]
  price_book?: IProductPriceBook | null
  seasonal_prices?: IProductSeasonalPrice[]
  price_history?: IProductPriceHistory[]
  availability?: ProductAvailability
  inventory?: IProductInventory
  category_id?: string | null
  subcategory_id?: string | null
  /** Unit of measure shown next to the price (unit, user, hour...). */
  uom?: string
  rental?: IProductRental
  price_rules?: IProductPriceRule[]
  delivery?: IProductDelivery
  field_links?: IProductFieldLink[]
  field_values?: Record<string, ProductFieldValue>
  /** Average unit cost (products for sale), integer cents. */
  cost_cents?: number
}
