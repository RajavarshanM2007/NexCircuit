'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { FONT_MAP, hexToRgbChannels } from '@/lib/site-config'

export { FONT_MAP } from '@/lib/site-config'

// ── Button / Footer types ────────────────────────────────────────────────────

export interface SocialLink   { label: string; href: string; enabled: boolean }
export interface SiteButton  { id: string; label: string; href: string }
export interface FooterLink  { label: string; href: string }
export interface FooterColumn { title: string; links: FooterLink[] }
export interface ProductAccordion { title: string; content: string }
export interface HomepageSection {
  id:          string
  isActive:    boolean
  eyebrow:     string
  headline:    string
  description: string
  buttonLabel: string
  buttonUrl:   string
}

// ── Per-section text style ───────────────────────────────────────────────────

export interface TextStyle {
  fontFamily:      string   // key in FONT_MAP; '' / 'default' = inherit
  fontSize:        number   // px; 0 = inherit component default
  fontWeight:      string   // '400'|'500'|'600'|'700'|'800'|'900'; '' = inherit
  letterSpacing:   number   // em; 0 = inherit (e.g. 0.15 for 0.15em)
  color:           string   // hex; '' = inherit
  shadowIntensity: number   // 0–10
  glowIntensity:   number   // 0–10
}

export type TextStyleKey =
  | 'navTitle'         // Navbar wordmark
  | 'navMotto'         // Navbar tagline / subheading (e.g. "VIT Electronics")
  | 'navLinks'         // Nav menu / drawer links
  | 'heroHeadline'     // Hero slider big headline
  | 'heroSubheading'   // Hero slider sub-line
  | 'scrollGallery'    // Scroll gallery headline + sub
  | 'sectionHeading'   // Editorial / page section headings
  | 'sectionBody'      // Editorial / page body paragraphs
  | 'editorialHeading' // "Crafted in silence…" editorial block heading
  | 'editorialBody'    // Editorial block body text
  | 'homepageSection'  // Homepage section headings (New Arrivals, The Selection…)
  | 'productCard'      // Product name on grid cards
  | 'productPage'      // Product name on detail page
  | 'footer'           // Footer text
  | 'profile'          // Profile page text
  | 'bodyText'         // General body / paragraph text site-wide

export type TextStyles = Record<TextStyleKey, TextStyle>

const BLANK_STYLE: TextStyle = { fontFamily: 'default', fontSize: 0, fontWeight: '', letterSpacing: 0, color: '', shadowIntensity: 0, glowIntensity: 0 }

export const DEFAULT_TEXT_STYLES: TextStyles = {
  navTitle:         { ...BLANK_STYLE },
  navMotto:         { ...BLANK_STYLE },
  navLinks:         { ...BLANK_STYLE },
  heroHeadline:     { ...BLANK_STYLE },
  heroSubheading:   { ...BLANK_STYLE },
  scrollGallery:    { ...BLANK_STYLE },
  sectionHeading:   { ...BLANK_STYLE },
  sectionBody:      { ...BLANK_STYLE },
  editorialHeading: { ...BLANK_STYLE },
  editorialBody:    { ...BLANK_STYLE },
  homepageSection:  { ...BLANK_STYLE },
  productCard:      { ...BLANK_STYLE },
  productPage:      { ...BLANK_STYLE },
  footer:           { ...BLANK_STYLE },
  profile:          { ...BLANK_STYLE },
  bodyText:         { ...BLANK_STYLE },
}

// ── SiteConfig ───────────────────────────────────────────────────────────────

export interface SiteConfig {
  fontFamily:    string
  fontSize:      number
  fontWeight:    string
  fontStyle:     string
  siteTitle:     string
  siteMotto:     string
  buttons:       SiteButton[]
  colorGold:     string
  colorText:     string
  colorBg:       string
  colorMuted:    string
  footerTagline:     string
  footerNote:        string
  footerColumns:     FooterColumn[]
  socialLinks:       SocialLink[]
  textStyles:        TextStyles
  productAccordions:      ProductAccordion[]
  homepageSections:       HomepageSection[]
  sizeGuideContactText:   string
  sizeGuideContactLinkText: string
  sizeGuideContactLinkUrl:  string
  shippingCost:    number   // flat fee per order; 0 = free shipping
  taxRate:         number   // percentage, e.g. 18 for 18%
  taxLabel:        string   // shown to customer, e.g. "GST" or "VAT"
  whatsappNumber:          string
  whatsappMessageTemplate: string
  whatsappImageUrl:        string
  invoiceEmailSubject:     string
  invoiceEmailBody:        string
  footerPrivateAccessLabel: string
  footerJoinLabel:          string
  footerEmailPlaceholder:   string
  faviconUrl:              string
  ogImageUrl:              string
  invoiceLogoUrl:          string
  invoiceCompanyName:      string
  invoiceCompanyAddress:   string
  invoiceFooterText:       string
}

const DEFAULT_FOOTER_COLUMNS: FooterColumn[] = [
  { title: 'Collections', links: [{ label: 'Men', href: '/collections/men' }, { label: 'Women', href: '/collections/women' }, { label: 'Bags', href: '/collections/bags' }] },
  { title: 'Account',     links: [{ label: 'Orders', href: '/orders' }, { label: 'Wishlist', href: '/wishlist' }] },
  { title: 'Support',     links: [{ label: 'Contact', href: '/contact' }, { label: 'Shipping', href: '/shipping' }, { label: 'Returns', href: '/returns' }] },
  { title: 'Company',     links: [{ label: 'About Us', href: '/about' }] },
]

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  fontFamily:    'default',
  fontSize:      16,
  fontWeight:    '400',
  fontStyle:     'normal',
  siteTitle:     'VIT',
  siteMotto:     'NEXT-GEN TECH & GADGETS',
  colorGold:     '#00f0ff',
  colorText:     '#1a1a1a',
  colorBg:       '#ffffff',
  colorMuted:    '#6f6c64',
  footerTagline:     'Next-generation gadgets, intelligent hardware & smart technology.',
  footerNote:        '© 2026 VIT. All rights reserved.',
  footerColumns:     DEFAULT_FOOTER_COLUMNS,
  socialLinks: [
    { label: 'Instagram', href: 'https://instagram.com/vit', enabled: true },
    { label: 'Twitter',   href: 'https://twitter.com/vit',   enabled: true },
    { label: 'YouTube',   href: 'https://youtube.com/@vit',  enabled: true },
    { label: 'GitHub',    href: 'https://github.com/vit',    enabled: true },
  ],
  textStyles:        DEFAULT_TEXT_STYLES,
  productAccordions: [
    { title: 'Tech Specs & Performance', content: 'Engineered with cutting-edge processors, aerospace-grade alloys, and long-lasting intelligent battery life.' },
    { title: 'Warranty & Support',        content: 'Includes 1-year comprehensive VIT hardware warranty and 24/7 dedicated online support.' },
    { title: 'Express Delivery',         content: 'Fast dispatch with end-to-end tracking and secure signature verification on all orders.' },
  ],
  homepageSections: [
    { id: 'new-arrivals', isActive: true, eyebrow: 'Latest Innovations',  headline: 'Trending Tech & Gadgets',                   description: '', buttonLabel: '', buttonUrl: '' },
    { id: 'featured',     isActive: true, eyebrow: 'Flagship Devices',     headline: 'Curated Gear',                              description: '', buttonLabel: '', buttonUrl: '' },
    { id: 'editorial',    isActive: true, eyebrow: 'VIT Innovations',      headline: 'Engineered for Performance.',               description: 'Every gadget is designed with precision engineering, advanced thermal cooling, and seamless connectivity. Built for creators, tech enthusiasts, and visionaries.', buttonLabel: 'Explore Gadgets', buttonUrl: '/collections/smart-devices' },
    { id: 'philosophy',   isActive: true, eyebrow: 'Our Vision',           headline: 'Smart Technology.\nBuilt Without Compromise.', description: 'We believe hardware should be powerful, beautiful, and intuitive. From smart audio to high-performance computing, we build the future today.', buttonLabel: '', buttonUrl: '' },
    { id: 'newsletter',   isActive: true, eyebrow: 'VIP Access',           headline: 'Stay Ahead of Tech',                        description: 'Subscribe for exclusive early-bird drops, firmware updates, and member-only tech deals.', buttonLabel: 'Subscribe', buttonUrl: '' },
  ],
  sizeGuideContactText:     'Need technical advice?',
  sizeGuideContactLinkText: 'Contact our product specialists',
  sizeGuideContactLinkUrl:  '/contact',
  shippingCost:   0,
  taxRate:        0,
  taxLabel:       'Tax',
  whatsappNumber:          '',
  whatsappMessageTemplate: '',
  whatsappImageUrl:        '',
  invoiceEmailSubject:     '',
  invoiceEmailBody:        '',
  footerPrivateAccessLabel: 'Insider Access',
  footerJoinLabel:          'Join',
  footerEmailPlaceholder:   'Your email address',
  faviconUrl:              '',
  ogImageUrl:              '',
  invoiceLogoUrl:          '',
  invoiceCompanyName:      'VIT Tech',
  invoiceCompanyAddress:   '',
  invoiceFooterText:       'Thank you for choosing VIT Tech!',
  buttons: [
    { id: 'hero_explore',   label: 'Explore',                href: '/collections/new-arrivals' },
    { id: 'editorial_cta',  label: 'Explore the Collection', href: '/collections/new-arrivals' },
    { id: 'newsletter_btn', label: 'Subscribe',              href: '' },
    { id: 'add_to_cart',    label: 'Add to Bag',             href: '' },
  ],
}

// ── CSS helpers ──────────────────────────────────────────────────────────────

export function buildConfigCss(config: Partial<SiteConfig>): string {
  const lines: string[] = []

  const family = FONT_MAP[config.fontFamily ?? 'default'] ?? ''
  const size   = `${config.fontSize   ?? 16}px`
  const weight =  config.fontWeight   ?? '400'
  const style  =  config.fontStyle    ?? 'normal'
  if (family) {
    lines.push(`html{--font-serif:${family};--font-sans:${family};}`)
    lines.push(`:root body *{font-family:${family};}`)
    lines.push(`html{font-size:${size};}`)
    lines.push(`body{font-weight:${weight};font-style:${style};}`)
  }

  const DEFAULTS: Record<string, string> = { colorGold: '#c9a96e', colorText: '#1a1a1a', colorBg: '#ffffff', colorMuted: '#6f6c64' }
  const VARS:     Record<string, string> = { colorGold: '--color-gold-rgb', colorText: '--color-text-rgb', colorBg: '--color-bg-rgb', colorMuted: '--color-muted-rgb' }
  const cv: string[] = []
  for (const [key, cssVar] of Object.entries(VARS)) {
    const hex = (config as any)[key] ?? DEFAULTS[key]
    if (hex && hex.toLowerCase() !== DEFAULTS[key].toLowerCase()) {
      const rgb = hexToRgbChannels(hex)
      if (rgb) cv.push(`${cssVar}:${rgb}`)
    }
  }
  if (cv.length) lines.push(`:root{${cv.join(';')};}`)

  return lines.join('')
}

/** Convert a TextStyle object → React inline CSS properties. */
export function buildTextStyle(s: TextStyle | undefined): React.CSSProperties {
  if (!s) return {}
  const css: React.CSSProperties = {}

  const family = FONT_MAP[s.fontFamily ?? 'default'] ?? ''
  if (family) css.fontFamily = family
  if ((s.fontSize ?? 0) > 0) {
    const px = s.fontSize
    // clamp() ensures the admin-configured size only applies at desktop width
    // and scales down proportionally so it never overflows small screens.
    // At 375px (iPhone SE): ~35% of target. At 1440px: 100% of target.
    const minPx = Math.max(14, Math.round(px * 0.35))
    const vw    = (px / 1440 * 100).toFixed(2)
    css.fontSize = `clamp(${minPx}px, ${vw}vw, ${px}px)`
  }
  if (s.fontWeight) css.fontWeight = s.fontWeight
  if ((s.letterSpacing ?? 0) !== 0) css.letterSpacing = `${s.letterSpacing}em`
  if (s.color) css.color = s.color

  const shadows: string[] = []
  if ((s.shadowIntensity ?? 0) > 0) {
    const n = s.shadowIntensity
    const blur    = n * 2
    const opacity = Math.min(n * 0.07, 0.7).toFixed(2)
    shadows.push(`1px 2px ${blur}px rgba(0,0,0,${opacity})`)
    if (n > 4) shadows.push(`3px 5px ${n * 4}px rgba(0,0,0,${(n * 0.035).toFixed(2)})`)
  }
  if ((s.glowIntensity ?? 0) > 0) {
    const n = s.glowIntensity
    const c = s.color || '#c9a96e'
    shadows.push(
      `0 0 ${n * 2}px ${c}cc`,
      `0 0 ${n * 6}px ${c}77`,
      `0 0 ${n * 14}px ${c}33`,
    )
  }
  if (shadows.length) css.textShadow = shadows.join(', ')

  return css
}

// ── Context + Provider ───────────────────────────────────────────────────────

const SiteConfigContext = createContext<SiteConfig>(DEFAULT_SITE_CONFIG)

export function useSiteConfig()                         { return useContext(SiteConfigContext) }
export function useButton(id: string): SiteButton {
  const { buttons } = useSiteConfig()
  return buttons.find(b => b.id === id) ?? DEFAULT_SITE_CONFIG.buttons.find(b => b.id === id) ?? { id, label: id, href: '/' }
}
export function useTextStyle(key: TextStyleKey): React.CSSProperties {
  const { textStyles } = useSiteConfig()
  return buildTextStyle(textStyles?.[key])
}

export const SITE_CONFIG_UPDATED_EVENT = 'site-config-updated'

function mergeConfig(src: Partial<SiteConfig> | null | undefined): SiteConfig {
  const rawStyles = (src as any)?.textStyles ?? {}
  const textStyles: TextStyles = { ...DEFAULT_TEXT_STYLES }
  for (const key of Object.keys(DEFAULT_TEXT_STYLES) as TextStyleKey[]) {
    if (rawStyles[key]) textStyles[key] = { ...BLANK_STYLE, ...rawStyles[key] }
  }
  return {
    ...DEFAULT_SITE_CONFIG,
    ...src,
    textStyles,
    buttons: ((src?.buttons as SiteButton[]) ?? []).length ? (src?.buttons as SiteButton[]) : DEFAULT_SITE_CONFIG.buttons,
    socialLinks:       ((src?.socialLinks       as SocialLink[])       ?? []).length ? (src?.socialLinks       as SocialLink[])       : DEFAULT_SITE_CONFIG.socialLinks,
    footerColumns:     ((src?.footerColumns     as FooterColumn[])     ?? []).length ? (src?.footerColumns     as FooterColumn[])     : DEFAULT_SITE_CONFIG.footerColumns,
    productAccordions: ((src?.productAccordions as ProductAccordion[]) ?? []).length ? (src?.productAccordions as ProductAccordion[]) : DEFAULT_SITE_CONFIG.productAccordions,
    homepageSections:  ((src?.homepageSections  as HomepageSection[])  ?? []).length ? (src?.homepageSections  as HomepageSection[])  : DEFAULT_SITE_CONFIG.homepageSections,
  }
}

export function SiteConfigProvider({ children, initialConfig }: { children: React.ReactNode; initialConfig?: Partial<SiteConfig> }) {
  const [liveConfig, setLiveConfig] = useState<Partial<SiteConfig> | null>(null)

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

    function fetchConfig() {
      fetch(`${base}/site-config`)
        .then(r => r.ok ? r.json() : null)
        .then(json => {
          const data = (json?.success && json?.data) ? json.data : json
          if (data) setLiveConfig(data)
        })
        .catch(() => {})
    }

    fetchConfig()
    window.addEventListener(SITE_CONFIG_UPDATED_EVENT, fetchConfig)
    return () => window.removeEventListener(SITE_CONFIG_UPDATED_EVENT, fetchConfig)
  }, [])

  const config = mergeConfig(liveConfig ?? initialConfig)

  useEffect(() => {
    const css = buildConfigCss(config)
    let el = document.getElementById('site-cfg') as HTMLStyleElement | null
    if (!el) {
      el = document.createElement('style')
      el.id = 'site-cfg'
      document.head.appendChild(el)
    }
    el.textContent = css
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.fontFamily, config.fontSize, config.fontWeight, config.fontStyle,
      config.colorGold, config.colorText, config.colorBg, config.colorMuted])

  return <SiteConfigContext.Provider value={config}>{children}</SiteConfigContext.Provider>
}
