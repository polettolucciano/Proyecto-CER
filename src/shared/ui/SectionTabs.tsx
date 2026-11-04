/** Vistas de una misma sección, con enlaces que admiten recarga y Atrás. */
export function SectionTabs({ label, page, value, items, onChange }: {
  label: string;
  page: string;
  value: string;
  items: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return <nav className="section-tabs" aria-label={label}>{items.map(item =>
    <a key={item.value} href={`#${page}?view=${item.value}`} aria-current={item.value === value ? 'page' : undefined} onClick={event => { event.preventDefault(); onChange(item.value); }}>{item.label}</a>,
  )}</nav>;
}
