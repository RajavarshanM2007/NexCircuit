'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Trash2, Plus, Settings, X, ChevronRight, ChevronDown, GripVertical, ChevronUp } from 'lucide-react'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, arrayMove, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { api } from '@/lib/api'
import { CategoryHighlightsManager } from '@/components/admin/CategoryHighlightsManager'
import { CategoryInfoBlocksManager } from '@/components/admin/CategoryInfoBlocksManager'
import { useAdminToast } from '@/components/admin/AdminToast'
import {
  buildTextStyle, DEFAULT_TEXT_STYLES,
  type TextStyle, type TextStyles,
} from '@/context/SiteConfigContext'
import { FONT_OPTIONS } from '@/lib/site-config'

// ── Types ─────────────────────────────────────────────────────────────────────

interface CategoryNode {
  id:             string
  name:           string
  slug:           string
  imageUrl:       string | null
  description:    string | null
  pageType:       string
  linkUrl:        string | null
  parentId:       string | null
  newArrivalDays: number
  headingStyle:   TextStyle | null
  children:       CategoryNode[]
}

function flattenTree(nodes: CategoryNode[]): CategoryNode[] {
  return nodes.flatMap(n => [n, ...flattenTree(n.children ?? [])])
}

// The API returns headingStyle as the raw JSON string stored in the DB —
// parse it into a TextStyle object (or null if missing/invalid).
function parseHeadingStyle(raw: unknown): TextStyle | null {
  let value = raw
  if (typeof value === 'string') {
    try { value = JSON.parse(value) } catch { return null }
  }
  if (!value || typeof value !== 'object' || typeof (value as TextStyle).fontFamily !== 'string') return null
  return value as TextStyle
}

function normalizeTree(nodes: any[]): CategoryNode[] {
  return (nodes ?? []).map(n => ({
    ...n,
    headingStyle: parseHeadingStyle(n.headingStyle),
    children: normalizeTree(n.children ?? []),
  }))
}

const BLANK_STYLE: TextStyle = { fontFamily: 'default', fontSize: 0, fontWeight: '', letterSpacing: 0, color: '', shadowIntensity: 0, glowIntensity: 0 }

// ── Level colours ─────────────────────────────────────────────────────────────

const LEVEL_STYLES = [
  { card: 'border-blue-500/40 bg-blue-950/25',       badge: 'bg-blue-900/60 text-blue-300',       label: 'Root Category'   },
  { card: 'border-emerald-500/30 bg-emerald-950/20', badge: 'bg-emerald-900/60 text-emerald-300', label: 'Subcategory'     },
  { card: 'border-amber-500/30 bg-amber-950/20',     badge: 'bg-amber-900/60 text-amber-300',     label: 'Sub-subcategory' },
]
function levelStyle(depth: number) { return LEVEL_STYLES[Math.min(depth, 2)] }

// ── Shared heading style controls ─────────────────────────────────────────────

function FontSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <span className="text-luxury-muted text-[10px] uppercase tracking-luxury block mb-1">Font Family</span>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-luxury-black border border-luxury-gray/50 text-luxury-white text-xs px-2 py-1.5 outline-none focus:border-luxury-gold">
        {(['Default', 'Google Fonts', 'System'] as const).map(g => {
          const opts = FONT_OPTIONS.filter(o => o.group === g)
          if (!opts.length) return null
          return (
            <optgroup key={g} label={g}>
              {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </optgroup>
          )
        })}
      </select>
    </div>
  )
}

function SliderRow({ label, value, max = 10, onChange }: { label: string; value: number; max?: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-luxury-muted text-[10px] uppercase tracking-luxury">{label}</span>
        <span className="text-luxury-muted text-[10px] font-mono">{value}</span>
      </div>
      <input type="range" min={0} max={max} value={value} onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-luxury-gold h-1" />
    </div>
  )
}

function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const safe = /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#1a1a1a'
  return (
    <div>
      <span className="text-luxury-muted text-[10px] uppercase tracking-luxury block mb-1">{label}</span>
      <div className="flex items-center gap-2 border border-luxury-gray/50 rounded px-2 py-1.5">
        <label className="relative cursor-pointer shrink-0">
          <div className="w-6 h-6 rounded border border-luxury-gray/50" style={{ backgroundColor: safe }} />
          <input type="color" value={safe} onChange={e => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
        </label>
        <input value={value} onChange={e => onChange(e.target.value)} maxLength={7}
          className="bg-transparent text-luxury-muted text-[10px] font-mono w-full outline-none" />
      </div>
    </div>
  )
}

function HeadingStyleControls({ value, onChange }: { value: TextStyle; onChange: (v: TextStyle) => void }) {
  const set = (field: keyof TextStyle) => (v: any) => onChange({ ...value, [field]: v })
  const preview = buildTextStyle(value)

  return (
    <div className="space-y-4">
      <div className="bg-luxury-white/[0.03] rounded p-3 border border-luxury-gray/20">
        <p className="text-luxury-muted text-[10px] uppercase tracking-luxury mb-1">Preview</p>
        <p style={{ ...preview, fontSize: preview.fontSize || '1.2rem' }} className="text-luxury-white">
          Category Title Preview
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <FontSelect value={value.fontFamily ?? 'default'} onChange={set('fontFamily')} />
        </div>
        <div>
          <SliderRow
            label={`Size — ${value.fontSize > 0 ? `${value.fontSize}px` : 'inherit'}`}
            value={value.fontSize} max={96} onChange={set('fontSize')}
          />
        </div>
        <ColorPicker label="Text Colour" value={value.color || '#1a1a1a'} onChange={set('color')} />
        <div className="col-span-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-luxury-muted text-[10px] uppercase tracking-luxury">Letter Spacing</span>
            <span className="text-luxury-muted text-[10px] font-mono">
              {(value.letterSpacing ?? 0) === 0 ? 'inherit' : `${(value.letterSpacing ?? 0).toFixed(2)}em`}
            </span>
          </div>
          <input type="range" min={-0.05} max={0.5} step={0.01}
            value={value.letterSpacing ?? 0}
            onChange={e => set('letterSpacing')(Number(e.target.value))}
            className="w-full accent-luxury-gold h-1" />
          <div className="flex justify-between text-luxury-muted text-[9px] mt-0.5">
            <span>−0.05em (tight)</span><span>0 (inherit)</span><span>0.5em (wide)</span>
          </div>
        </div>
        <div className="col-span-2">
          <span className="text-luxury-muted text-[10px] uppercase tracking-luxury block mb-1">Font Weight</span>
          <div className="flex gap-1.5 flex-wrap">
            {[['', 'Default'], ['300', 'Light'], ['400', 'Regular'], ['500', 'Medium'], ['600', 'Semi-Bold'], ['700', 'Bold'], ['800', 'Extra Bold'], ['900', 'Black']].map(([w, label]) => (
              <button key={w} onClick={() => set('fontWeight')(w)}
                className={`px-2.5 py-1 text-[10px] border transition-colors ${
                  (value.fontWeight ?? '') === w
                    ? 'border-luxury-gold text-luxury-gold'
                    : 'border-luxury-gray text-luxury-muted hover:border-luxury-white hover:text-luxury-white'
                }`}
                style={{ fontWeight: w || 'inherit' }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SliderRow label="Shadow Intensity" value={value.shadowIntensity ?? 0} onChange={set('shadowIntensity')} />
        <SliderRow label="Glow Intensity"   value={value.glowIntensity   ?? 0} onChange={set('glowIntensity')} />
      </div>
    </div>
  )
}

// ── Configure modal ───────────────────────────────────────────────────────────

function ConfigureModal({ cat, allCats, onClose, onSaved }: {
  cat: CategoryNode
  allCats: CategoryNode[]
  onClose: () => void
  onSaved: (updated: Partial<CategoryNode>) => void
}) {
  const { toast } = useAdminToast()
  const [name,                setName]                = useState(cat.name)
  const [slug,                setSlug]                = useState(cat.slug)
  const [description,         setDescription]         = useState(cat.description ?? '')
  const [pageType,            setPageType]            = useState(cat.pageType ?? 'products')
  const [linkUrl,             setLinkUrl]             = useState(cat.linkUrl ?? '')
  const [newArrivalDays,      setNewArrivalDays]      = useState(cat.newArrivalDays ?? 10)
  const [headingOverride,     setHeadingOverride]     = useState<boolean>(cat.headingStyle !== null)
  const [headingStyle,        setHeadingStyle]        = useState<TextStyle>(cat.headingStyle ?? { ...BLANK_STYLE })
  const [saving,              setSaving]              = useState(false)
  const [error,               setError]               = useState<string | null>(null)
  const outerRef = useRef<HTMLDivElement>(null)

  const otherNewArrivalsCat = flattenTree(allCats).find(
    c => c.pageType === 'new-arrivals' && c.id !== cat.id
  )

  useEffect(() => {
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    const stopProp = (e: WheelEvent) => e.stopPropagation()
    const el = outerRef.current
    el?.addEventListener('wheel', stopProp, { passive: true })
    return () => {
      el?.removeEventListener('wheel', stopProp)
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
    }
  }, [])

  async function save() {
    setSaving(true); setError(null)
    try {
      await api.patch(`/admin/categories/${cat.id}`, {
        name, slug: slug || undefined,
        description, pageType,
        linkUrl: pageType === 'link' ? linkUrl : null,
        newArrivalDays: pageType === 'new-arrivals' ? newArrivalDays : undefined,
        headingStyle: headingOverride ? JSON.stringify(headingStyle) : null,
      })
      onSaved({ name, slug, description, pageType, linkUrl: pageType === 'link' ? linkUrl : null, newArrivalDays, headingStyle: headingOverride ? headingStyle : null })
      toast('Category saved.')
      onClose()
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div ref={outerRef} className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="flex min-h-full items-start justify-center px-4 pt-16 pb-16">
        <div className="relative w-full max-w-2xl bg-luxury-black border border-luxury-gray rounded-2xl shadow-2xl">

          <div className="sticky top-0 z-10 flex items-center justify-between px-8 py-5 border-b border-luxury-gray bg-luxury-black rounded-t-2xl">
            <div>
              <h2 className="font-serif text-xl tracking-luxury text-luxury-white">Configure Category</h2>
              <p className="text-luxury-muted text-xs mt-0.5 tracking-luxury">{cat.name}</p>
            </div>
            <button onClick={onClose} className="text-luxury-muted hover:text-luxury-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-8 py-6 space-y-5">
            {/* Name */}
            <div>
              <label className="block text-luxury-muted text-xs uppercase tracking-luxury mb-2">Category Name</label>
              <input value={name} onChange={e => setName(e.target.value)}
                className="w-full bg-luxury-black border border-luxury-gray text-luxury-white px-3 py-2 text-sm outline-none focus:border-luxury-gold rounded" />
            </div>

            {/* Slug */}
            <div>
              <label className="block text-luxury-muted text-xs uppercase tracking-luxury mb-1">
                URL Slug <span className="text-luxury-muted/60 normal-case tracking-normal">(auto-generated if blank)</span>
              </label>
              <div className="flex items-center gap-2 border border-luxury-gray rounded focus-within:border-luxury-gold px-3 py-2">
                <span className="text-luxury-muted/50 text-xs">/collections/</span>
                <input value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                  placeholder={cat.slug}
                  className="flex-1 bg-transparent text-luxury-white text-sm outline-none" />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-luxury-muted text-xs uppercase tracking-luxury mb-2">Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                className="w-full bg-luxury-black border border-luxury-gray text-luxury-white px-3 py-2 text-sm outline-none focus:border-luxury-gold rounded resize-none" />
            </div>

            {/* Page type */}
            <div>
              <label className="block text-luxury-muted text-xs uppercase tracking-luxury mb-3">Page Type</label>
              <div className="flex gap-6 flex-wrap">
                {([
                  ['products', 'Products page'],
                  ['info',     'Info / Editorial'],
                  ...(!cat.children?.length ? [['link', 'Link (redirect)']] as const : []),
                ] as const).map(([t, label]) => (
                  <label key={t} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={pageType === t} onChange={() => setPageType(t)} className="accent-luxury-gold" />
                    <span className={`text-sm ${pageType === t ? 'text-luxury-white' : 'text-luxury-muted'}`}>{label}</span>
                  </label>
                ))}
                <label className={`flex items-center gap-2 ${otherNewArrivalsCat ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
                  <input type="radio" checked={pageType === 'new-arrivals'}
                    onChange={() => !otherNewArrivalsCat && setPageType('new-arrivals')}
                    disabled={!!otherNewArrivalsCat} className="accent-luxury-gold" />
                  <span className={`text-sm ${pageType === 'new-arrivals' ? 'text-luxury-white' : 'text-luxury-muted'}`}>
                    New Arrivals
                    {otherNewArrivalsCat && (
                      <span className="ml-1.5 text-[10px] text-luxury-muted/60 normal-case">
                        (used by "{otherNewArrivalsCat.name}")
                      </span>
                    )}
                  </span>
                </label>
              </div>

              {pageType === 'new-arrivals' && (
                <div className="mt-4 flex items-center gap-3">
                  <label className="text-luxury-muted text-xs uppercase tracking-luxury shrink-0">New badge window</label>
                  <input type="number" min={1} max={365} value={newArrivalDays}
                    onChange={e => setNewArrivalDays(Math.max(1, Number(e.target.value)))}
                    className="w-20 bg-luxury-black border border-luxury-gray text-luxury-white px-3 py-1.5 text-sm outline-none focus:border-luxury-gold rounded text-center" />
                  <span className="text-luxury-muted text-xs">days</span>
                </div>
              )}

              {pageType === 'link' && (
                <div className="mt-4">
                  <label className="block text-luxury-muted text-xs uppercase tracking-luxury mb-2">Redirect URL</label>
                  <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
                    placeholder="https://example.com or /collections/sale"
                    className="w-full bg-luxury-black border border-luxury-gray text-luxury-white px-3 py-2 text-sm outline-none focus:border-luxury-gold rounded" />
                </div>
              )}
            </div>

            {/* Per-category heading style */}
            <div className="border-t border-luxury-gray/30 pt-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-luxury-white text-xs tracking-luxury uppercase">Heading Style</p>
                  <p className="text-luxury-muted text-[10px] mt-0.5">Override the global default for this category's title</p>
                </div>
                <button
                  onClick={() => {
                    setHeadingOverride(o => !o)
                    if (!headingOverride) setHeadingStyle({ ...BLANK_STYLE })
                  }}
                  className={`text-[10px] uppercase tracking-luxury px-3 py-1.5 border transition-colors ${
                    headingOverride
                      ? 'border-luxury-gold text-luxury-gold'
                      : 'border-luxury-gray text-luxury-muted hover:border-luxury-white hover:text-luxury-white'
                  }`}>
                  {headingOverride ? 'Override on' : 'Use global default'}
                </button>
              </div>
              {headingOverride && (
                <HeadingStyleControls value={headingStyle} onChange={setHeadingStyle} />
              )}
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button onClick={save} disabled={saving}
              className="px-6 py-2.5 border border-luxury-gold text-luxury-gold text-xs tracking-luxury uppercase hover:bg-luxury-gold hover:text-luxury-black transition-all duration-300 disabled:opacity-50 rounded-full">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>

            {/* Media / Highlights */}
            {pageType !== 'link' && (
              <div className="border-t border-luxury-gray/50 pt-6 space-y-8 pb-4">
                {pageType === 'info' ? (
                  <CategoryInfoBlocksManager categoryId={cat.id} />
                ) : (
                  <>
                    <CategoryHighlightsManager categoryId={cat.id} categoryName="Hero Slider"    placement="hero"    />
                    <CategoryHighlightsManager categoryId={cat.id} categoryName="Scroll Gallery" placement="gallery" />
                  </>
                )}
                {cat.parentId !== null && (
                  <CategoryHighlightsManager categoryId={cat.id} categoryName="Menu Image" placement="menu" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Sortable wrapper ──────────────────────────────────────────────────────────

function SortableCategory({ cat, depth, allCats, onRefresh }: {
  cat: CategoryNode; depth: number; allCats: CategoryNode[]; onRefresh: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cat.id })
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}>
      <CategoryCard cat={cat} depth={depth} allCats={allCats} onRefresh={onRefresh}
        dragHandle={
          <button {...attributes} {...listeners}
            className="text-luxury-muted/30 hover:text-luxury-muted/70 cursor-grab active:cursor-grabbing shrink-0 touch-none p-0.5 transition-colors"
            title="Drag to reorder">
            <GripVertical className="w-4 h-4" />
          </button>
        }
      />
    </div>
  )
}

// ── Category card ─────────────────────────────────────────────────────────────

const MAX_DEPTH = 2

function CategoryCard({ cat, depth, allCats, onRefresh, dragHandle }: {
  cat: CategoryNode; depth: number; allCats: CategoryNode[]; onRefresh: () => void; dragHandle?: React.ReactNode
}) {
  const style = levelStyle(depth)
  const hasChildren = (cat.children?.length ?? 0) > 0

  const [expanded,     setExpanded]     = useState(false)
  const [nameEdit,     setNameEdit]     = useState(false)
  const [name,         setName]         = useState(cat.name)
  const [configOpen,   setConfigOpen]   = useState(false)
  const [addingChild,  setAddingChild]  = useState(false)
  const [newChildName, setNewChildName] = useState('')
  const [deleting,     setDeleting]     = useState(false)

  const [childOrder, setChildOrder] = useState<string[]>(() => cat.children?.map(c => c.id) ?? [])
  useEffect(() => { setChildOrder(cat.children?.map(c => c.id) ?? []) }, [cat.children])
  const sortedChildren = useMemo(
    () => childOrder.map(id => cat.children?.find(c => c.id === id)).filter((c): c is CategoryNode => !!c),
    [childOrder, cat.children],
  )

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function handleChildDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const prev = childOrder
    const oldIdx = prev.indexOf(active.id as string)
    const newIdx = prev.indexOf(over.id as string)
    const next = arrayMove(prev, oldIdx, newIdx)
    setChildOrder(next)
    api.patch('/admin/categories/reorder', { items: next.map((id, i) => ({ id, sortOrder: i })) })
      .catch(() => setChildOrder(prev))
  }

  async function saveName() {
    if (name.trim() === cat.name) { setNameEdit(false); return }
    try {
      await api.patch(`/admin/categories/${cat.id}`, { name: name.trim() })
      cat.name = name.trim(); onRefresh()
    } catch {}
    setNameEdit(false)
  }

  async function deleteCategory() {
    if (!confirm(`Delete "${cat.name}"? This cannot be undone.`)) return
    setDeleting(true)
    try { await api.delete(`/admin/categories/${cat.id}`); onRefresh() }
    catch (e: any) { alert(e?.response?.data?.message ?? e?.message ?? 'Cannot delete — move products/subcategories first.') }
    setDeleting(false)
  }

  async function addChild() {
    if (!newChildName.trim()) return
    try {
      await api.post('/admin/categories', { name: newChildName.trim(), parentId: cat.id, pageType: 'products' })
      setNewChildName(''); setAddingChild(false); onRefresh(); setExpanded(true)
    } catch {}
  }

  const pageTypeBadge = cat.pageType === 'link'
    ? { text: 'Link',         cls: 'border-purple-400/40 text-purple-400' }
    : cat.pageType === 'info'
      ? { text: 'Info',         cls: 'border-luxury-gold/40 text-luxury-gold' }
      : cat.pageType === 'new-arrivals'
        ? { text: 'New Arrivals', cls: 'border-green-400/40 text-green-400' }
        : null

  return (
    <div>
      <div className={`border rounded-xl p-4 space-y-3 ${style.card}`}>
        <div className="flex items-center gap-2">
          {dragHandle}
          {hasChildren ? (
            <button onClick={() => setExpanded(e => !e)} className="text-luxury-muted hover:text-luxury-white transition-colors shrink-0">
              {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : <span className="w-4 shrink-0" />}
          <span className={`text-[9px] uppercase tracking-luxury px-2 py-0.5 rounded-full font-medium shrink-0 ${style.badge}`}>L{depth + 1}</span>
          {nameEdit ? (
            <input autoFocus value={name} onChange={e => setName(e.target.value)}
              onBlur={saveName} onKeyDown={e => e.key === 'Enter' && saveName()}
              className="flex-1 bg-luxury-black/60 border border-luxury-gold text-luxury-white text-sm px-2 py-1 outline-none rounded" />
          ) : (
            <button onClick={() => setNameEdit(true)} className="flex-1 text-left text-luxury-white text-sm font-medium hover:text-luxury-gold transition-colors truncate">
              {cat.name}
            </button>
          )}
          {pageTypeBadge && (
            <span className={`text-[9px] uppercase tracking-luxury px-1.5 py-0.5 border rounded shrink-0 ${pageTypeBadge.cls}`}>
              {pageTypeBadge.text}
            </span>
          )}
          {cat.headingStyle && (
            <span className="text-[9px] uppercase tracking-luxury px-1.5 py-0.5 border rounded shrink-0 border-sky-400/40 text-sky-400" title="Custom heading style">
              Custom Font
            </span>
          )}
          <button onClick={() => setConfigOpen(true)} className="text-luxury-muted hover:text-luxury-white transition-colors shrink-0" title="Configure">
            <Settings className="w-3.5 h-3.5" />
          </button>
          <button onClick={deleteCategory} disabled={deleting} className="text-red-400/60 hover:text-red-400 transition-colors disabled:opacity-30 shrink-0">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {depth < MAX_DEPTH && (
        <div className="mt-2 ml-6">
          {addingChild ? (
            <div className="flex gap-2">
              <input autoFocus value={newChildName} onChange={e => setNewChildName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addChild()} placeholder="Subcategory name…"
                className="flex-1 bg-luxury-black border border-luxury-gray text-luxury-white text-xs px-3 py-1.5 outline-none focus:border-luxury-gold rounded" />
              <button onClick={addChild} className="text-luxury-gold text-xs tracking-luxury uppercase hover:text-luxury-white px-3">Add</button>
              <button onClick={() => { setAddingChild(false); setNewChildName('') }} className="text-luxury-muted text-xs hover:text-luxury-white">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setAddingChild(true)}
              className="flex items-center gap-1.5 text-luxury-muted text-[10px] tracking-luxury uppercase hover:text-luxury-gold transition-colors mt-1.5">
              <Plus className="w-3 h-3" /> Add subcategory
            </button>
          )}
        </div>
      )}

      {hasChildren && expanded && (
        <div className="mt-3 ml-8 pl-4 border-l border-luxury-gray/30 space-y-3">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleChildDragEnd}>
            <SortableContext items={childOrder} strategy={verticalListSortingStrategy}>
              {sortedChildren.map(child => (
                <SortableCategory key={child.id} cat={child} depth={depth + 1} allCats={allCats} onRefresh={onRefresh} />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}

      {configOpen && (
        <ConfigureModal cat={cat} allCats={allCats} onClose={() => setConfigOpen(false)} onSaved={() => onRefresh()} />
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CategoriesAdminPage() {
  const { toast } = useAdminToast()
  const [tree,    setTree]    = useState<CategoryNode[]>([])
  const [loading, setLoading] = useState(true)
  const [adding,  setAdding]  = useState(false)
  const [newName, setNewName] = useState('')
  const [newSlug, setNewSlug] = useState('')

  // Global heading style
  const [globalStyleOpen,    setGlobalStyleOpen]    = useState(false)
  const [allTextStyles,      setAllTextStyles]      = useState<TextStyles>(DEFAULT_TEXT_STYLES)
  const [globalHeadingStyle, setGlobalHeadingStyle] = useState<TextStyle>({ ...BLANK_STYLE })
  const [savingGlobal,       setSavingGlobal]       = useState(false)

  // Root order for drag-and-drop
  const [rootOrder, setRootOrder] = useState<string[]>([])
  useEffect(() => { setRootOrder(tree.map(c => c.id)) }, [tree])
  const sortedTree = useMemo(
    () => rootOrder.map(id => tree.find(c => c.id === id)).filter((c): c is CategoryNode => !!c),
    [rootOrder, tree],
  )

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  async function fetchTree() {
    setLoading(true)
    try {
      const res = await api.get('/products/categories')
      setTree(normalizeTree(res.data ?? []))
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    fetchTree()
    api.get('/site-config').then(res => {
      const styles: TextStyles = { ...DEFAULT_TEXT_STYLES, ...(res.data?.textStyles ?? {}) }
      setAllTextStyles(styles)
      setGlobalHeadingStyle(styles.sectionHeading ?? { ...BLANK_STYLE })
    }).catch(() => {})
  }, [])

  async function saveGlobalStyle() {
    setSavingGlobal(true)
    try {
      await api.patch('/site-config', { textStyles: { ...allTextStyles, sectionHeading: globalHeadingStyle } })
      setAllTextStyles(prev => ({ ...prev, sectionHeading: globalHeadingStyle }))
      toast('Global heading style saved.')
    } catch {
      toast('Failed to save.')
    } finally {
      setSavingGlobal(false)
    }
  }

  function handleRootDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const prev = rootOrder
    const oldIdx = prev.indexOf(active.id as string)
    const newIdx = prev.indexOf(over.id as string)
    const next = arrayMove(prev, oldIdx, newIdx)
    setRootOrder(next)
    api.patch('/admin/categories/reorder', { items: next.map((id, i) => ({ id, sortOrder: i })) })
      .catch(() => setRootOrder(prev))
  }

  async function addRoot() {
    if (!newName.trim()) return
    try {
      await api.post('/admin/categories', { name: newName.trim(), slug: newSlug.trim() || undefined, pageType: 'products' })
      setNewName(''); setNewSlug(''); setAdding(false); fetchTree()
    } catch {}
  }

  return (
    <section className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-serif text-4xl tracking-luxury">Category Management</h1>
        <p className="text-luxury-muted text-sm mt-1 tracking-luxury">
          Drag the <GripVertical className="inline w-3.5 h-3.5 -mt-0.5" /> handle to reorder. Click a name to rename. Use ▶ to expand subcategories.
        </p>
      </div>

      {/* Global heading style */}
      <div className="border border-luxury-gray/50 rounded-xl overflow-hidden">
        <button
          onClick={() => setGlobalStyleOpen(o => !o)}
          className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-luxury-white/[0.02] transition-colors">
          <div>
            <p className="text-luxury-white text-sm tracking-luxury uppercase">Global Heading Style</p>
            <p className="text-luxury-muted text-[10px] mt-0.5">Default font for all category titles (per-category overrides take priority)</p>
          </div>
          {globalStyleOpen ? <ChevronUp className="w-4 h-4 text-luxury-muted" /> : <ChevronDown className="w-4 h-4 text-luxury-muted" />}
        </button>
        {globalStyleOpen && (
          <div className="px-5 pb-5 space-y-4 border-t border-luxury-gray/30 pt-4">
            <HeadingStyleControls value={globalHeadingStyle} onChange={setGlobalHeadingStyle} />
            <div className="flex items-center gap-3">
              <button onClick={saveGlobalStyle} disabled={savingGlobal}
                className="px-5 py-2 border border-luxury-gold text-luxury-gold text-xs tracking-luxury uppercase hover:bg-luxury-gold hover:text-luxury-black transition-all disabled:opacity-50 rounded-full">
                {savingGlobal ? 'Saving…' : 'Save Global Style'}
              </button>
              <button onClick={() => setGlobalHeadingStyle({ ...BLANK_STYLE })}
                className="text-luxury-muted text-[10px] tracking-luxury uppercase hover:text-red-400 transition-colors">
                Reset to defaults
              </button>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-luxury-muted text-sm">Loading…</p>
      ) : (
        <div className="space-y-4">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleRootDragEnd}>
            <SortableContext items={rootOrder} strategy={verticalListSortingStrategy}>
              {sortedTree.map(root => (
                <SortableCategory key={root.id} cat={root} depth={0} allCats={tree} onRefresh={fetchTree} />
              ))}
            </SortableContext>
          </DndContext>

          {adding ? (
            <div className="border border-luxury-gray/50 rounded-xl p-4 space-y-3">
              <p className="text-luxury-muted text-[10px] tracking-luxury uppercase">New Root Category</p>
              <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addRoot()} placeholder="Category name (e.g. Women)"
                className="w-full bg-luxury-black border border-luxury-gray text-luxury-white text-sm px-3 py-2 outline-none focus:border-luxury-gold rounded" />
              <div className="flex items-center gap-2 border border-luxury-gray rounded focus-within:border-luxury-gold px-3 py-2">
                <span className="text-luxury-muted/50 text-xs">/collections/</span>
                <input value={newSlug} onChange={e => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                  placeholder="custom-slug (optional)"
                  className="flex-1 bg-transparent text-luxury-white text-sm outline-none" />
              </div>
              <div className="flex gap-3">
                <button onClick={addRoot}
                  className="px-5 py-2 border border-luxury-gold text-luxury-gold text-xs tracking-luxury uppercase hover:bg-luxury-gold hover:text-luxury-black transition-all rounded-full">
                  Create
                </button>
                <button onClick={() => { setAdding(false); setNewName(''); setNewSlug('') }}
                  className="text-luxury-muted text-xs tracking-luxury uppercase hover:text-luxury-white transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAdding(true)}
              className="flex items-center gap-2 px-6 py-3 border border-luxury-gray text-luxury-muted text-xs tracking-luxury uppercase rounded-xl hover:border-luxury-gold hover:text-luxury-gold transition-all duration-300 w-full justify-center">
              <Plus className="w-4 h-4" /> Add New Category
            </button>
          )}
        </div>
      )}
    </section>
  )
}
