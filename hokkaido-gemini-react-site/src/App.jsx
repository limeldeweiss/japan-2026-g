import { useEffect, useMemo, useRef, useState } from "react";
import { Bed, Bus, ChevronDown, GraduationCap, Hotel, Info, Luggage, Map, MapPinned, Plane, Route, Ship, Utensils, VenetianMask, Zap } from "lucide-react";
import { itineraryData } from "./itineraryData";

const typeIcon = { transport: Bus, hotel: Hotel, sights: MapPinned, food: Utensils, ferry: Ship, tip: Info };

const overviewSectionMeta = [
  { pattern: /整體路線摘要|Routenuebersicht/i, title: { zh: "路線摘要", de: "Routenübersicht" }, Icon: Route },
  { pattern: /交通基礎|Verkehr/i, title: { zh: "交通資訊", de: "Verkehrsinfo" }, Icon: Plane },
  { pattern: /住宿位置判斷|Lage der Unterkunft|Unterkunft/i, title: { zh: "旅館資訊", de: "Hotelinfo" }, Icon: Bed },
  { pattern: /期間可能遇到的節慶與活動|Feste|Veranstaltungen/i, title: { zh: "節慶活動", de: "Feste & Events" }, Icon: VenetianMask },
  { pattern: /之後細化時的待確認事項|Noch zu pruefen|Noch zu prüfen/i, title: { zh: "提醒事項", de: "Hinweise" }, Icon: Zap },
  { pattern: /參考來源|Quellen/i, title: { zh: "參考來源", de: "Quellen" }, Icon: GraduationCap }
];

function overviewMetaFor(section, lang) {
  const title = lang === "de" ? section.title : section.title;
  const meta = overviewSectionMeta.find((item) => item.pattern.test(title));
  return meta || { title: { zh: section.title, de: section.title }, Icon: Info };
}

const overviewRows = itineraryData.overviewRows || [];
const overviewInfoDe = itineraryData.infoSectionsDe || [];
const germanDays = itineraryData.germanDays || [];

function enhanceTableHtml(html) {
  if (!html.includes("<table") || typeof DOMParser === "undefined") return html;

  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  doc.querySelectorAll("table").forEach((table) => {
    table.classList.add("mobile-card-table");
    const labels = [...table.querySelectorAll("thead th")].map((th) => th.textContent.trim());
    table.querySelectorAll("tbody tr").forEach((row) => {
      [...row.children].forEach((cell, index) => {
        if (labels[index] && !cell.hasAttribute("data-label")) {
          cell.setAttribute("data-label", labels[index]);
        }
      });
    });
  });

  return doc.body.firstElementChild.innerHTML;
}

function Html({ html }) {
  return <div className="rich-text" dangerouslySetInnerHTML={{ __html: enhanceTableHtml(html) }} />;
}

function text(item, lang) {
  if (Array.isArray(item)) return lang === "de" ? item[1] : item[0];
  if (item && typeof item === "object") return lang === "de" ? item.de : item.zh;
  return item;
}

function weekdayLabel(weekday, lang) {
  if (lang !== "de") return weekday;
  return { 一: "Mo", 二: "Di", 三: "Mi", 四: "Do", 五: "Fr", 六: "Sa", 日: "So" }[weekday] || weekday;
}

function Block({ block, lang, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const Icon = typeIcon[block.type] || Info;
  return (
    <section className={`accordion block-${block.type}`}>
      <button className="accordion-trigger" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <span className="block-icon"><Icon size={18} /></span>
        <span>{lang === "de" ? block.titleDe : block.title}</span>
        <ChevronDown className={open ? "chevron open" : "chevron"} size={18} />
      </button>
      {open && <Html html={lang === "de" ? block.htmlDe : block.html} />}
    </section>
  );
}

function normalizeStepTitle(title, lang) {
  return title
    .replace(/&gt;/g, ">")
    .replace(/Hotel ONE'S RESIDEN[CS]E/g, lang === "de" ? "Hotel" : "旅館")
    .replace(/\s*->\s*/g, " / ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitHtmlSteps(html, lang) {
  const pattern = /<p>####\s*(?:\d+\.\s*)?(.+?)<\/p>/g;
  const matches = [...html.matchAll(pattern)];

  if (matches.length === 0) return [];

  return matches.map((match, index) => {
    const start = match.index + match[0].length;
    const end = matches[index + 1]?.index ?? html.length;
    return {
      title: normalizeStepTitle(match[1], lang),
      html: html.slice(start, end).trim()
    };
  });
}

function RouteStep({ step, index, open, onToggle }) {
  return (
    <section className="route-step">
      <button className="step-index" type="button" onClick={onToggle} aria-expanded={open} aria-label={`Toggle step ${index + 1}`}>
        {index + 1}
      </button>
      <div className="step-body">
        <button className="step-heading step-heading-numbered" type="button" onClick={onToggle} aria-expanded={open}>
          <span>{step.title}</span>
          <ChevronDown className={open ? "chevron open" : "chevron"} size={18} />
        </button>
        {open && step.html && <Html html={step.html} />}
      </div>
    </section>
  );
}

function RouteBlock({ block, lang }) {
  const html = lang === "de" ? block.htmlDe : block.html;
  const steps = splitHtmlSteps(html, lang);
  const introHtml = steps.length > 0 ? html.slice(0, html.indexOf("<p>####")).trim() : html;
  const heading = lang === "de" ? "Route" : "路線";
  const [openSteps, setOpenSteps] = useState(() => steps.map(() => true));
  const allStepsOpen = steps.length > 0 && openSteps.every(Boolean);

  useEffect(() => {
    setOpenSteps(steps.map(() => true));
  }, [html]);

  function toggleAllSteps() {
    setOpenSteps(steps.map(() => !allStepsOpen));
  }

  function toggleStep(stepIndex) {
    setOpenSteps((current) => current.map((isOpen, index) => index === stepIndex ? !isOpen : isOpen));
  }

  return (
    <div className="route-block">
      <section className="route-summary">
        <div className="step-body">
          <button className="step-heading" type="button" onClick={toggleAllSteps} aria-expanded={allStepsOpen}>
            <span className="step-icon route-icon"><Route size={34} strokeWidth={2.6} /></span>
            <span>{heading}</span>
            <ChevronDown className={allStepsOpen ? "chevron open" : "chevron"} size={18} />
          </button>
          <Html html={introHtml} />
        </div>
      </section>
      {steps.map((step, index) => (
        <RouteStep
          key={`${step.title}-${index}`}
          step={step}
          index={index}
          open={openSteps[index] ?? true}
          onToggle={() => toggleStep(index)}
        />
      ))}
    </div>
  );
}

function Overview({ lang }) {
  const country = itineraryData.countryInfo;
  const infoSections = lang === "de" ? overviewInfoDe : itineraryData.infoSections;
  return (
    <main className="overview-grid">
      <section className="overview-panel wide-panel overview-table-panel">
        <div className="panel-label"><Bus size={34} />{lang === "de" ? "Unterkunft und Verkehr" : "住宿與交通"}</div>
        <div className="table-wrap overview-table-wrap">
          <table className="overview-table">
            <colgroup>
              <col className="date-col" />
              <col className="city-col" />
              <col className="plan-col" />
              <col className="address-col" />
            </colgroup>
            <thead>
              <tr>
                <th>{lang === "de" ? "Datum" : "日期"}</th>
                <th>{lang === "de" ? "Stadt" : "城市"}</th>
                <th>{lang === "de" ? "Unterkunft / Verkehr" : "已訂住宿 / 交通"}</th>
                <th>{lang === "de" ? "Adresse / Ziel" : "地址 / 到達點"}</th>
              </tr>
            </thead>
            <tbody>
              {overviewRows.map((row) => (
                <tr key={`${row.date}-${row.city}`}>
                  <td data-label={lang === "de" ? "Datum" : "日期"}>{(lang === "de" ? row.dateDe : row.date).split("\n").map((line) => <span key={line}>{line}</span>)}</td>
                  <td data-label={lang === "de" ? "Stadt" : "城市"}>{lang === "de" ? row.cityDe : row.city}</td>
                  <td data-label={lang === "de" ? "Verkehr" : "交通"}>{lang === "de" ? row.planDe : row.plan}</td>
                  <td data-label={lang === "de" ? "Ziel" : "到達點"}>{lang === "de" ? row.addressDe || row.address : row.address}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overview-panel wide-panel intro-panel">
        <div className="panel-label"><Luggage size={34} />{lang === "de" ? "Reiseinfos" : "旅遊資訊"}</div>
        {itineraryData.intro.map((item, index) => <Html key={index} html={text(item, lang)} />)}
      </section>
      {country && (
        <section className="overview-panel country-panel">
          <div className="panel-label"><Map size={34} />{text(country.name, lang)}</div>
          <div className="country-table">
            {country.rows.map((row) => (
              <div className="country-row" key={row[0]}>
                <span>{lang === "de" ? row[1] : row[0]}</span>
                <Html html={text(row[2], lang)} />
              </div>
            ))}
          </div>
          <ul className="note-list">{country.notes.map((note, index) => <li key={index}>{text(note, lang)}</li>)}</ul>
        </section>
      )}
      {infoSections.map((section) => {
        const meta = overviewMetaFor(section, lang);
        const Icon = meta.Icon;
        return (
          <section className="overview-panel wide-panel" key={section.title}>
            <div className="panel-label"><Icon size={34} />{meta.title[lang] || section.title}</div>
            <Html html={section.html} />
          </section>
        );
      })}
    </main>
  );
}

function DayDetail({ day, index, lang }) {
  const germanDay = germanDays[index];
  const displayBlocks = lang === "de" && germanDay
    ? [{ title: "Route", titleDe: "Route", html: germanDay.html, htmlDe: germanDay.html, type: "transport" }]
    : day.blocks;
  return (
    <article className="day-detail">
      <header className="day-detail-head">
        <div>
          <span className="day-kicker">{lang === "de" ? `TAG ${index + 1}` : `DAY ${index + 1}`}</span>
          <h2>{lang === "de" ? day.titleDe : day.title}</h2>
        </div>
        <div className="date-pill">{day.date} {weekdayLabel(day.weekday, lang)}</div>
      </header>
      <div className="route-stack">
        {displayBlocks.map((block, blockIndex) => <RouteBlock key={`${block.title}-${blockIndex}`} block={block} lang={lang} />)}
      </div>
    </article>
  );
}

export default function App() {
  const [lang, setLang] = useState(() => localStorage.getItem("trip-lang") || "zh");
  const [active, setActive] = useState("overview");
  const layoutRef = useRef(null);
  const dayTimelineRefs = useRef([]);
  const activeDay = useMemo(() => itineraryData.days[Number(active)], [active]);

  function changeLang(nextLang) {
    setLang(nextLang);
    localStorage.setItem("trip-lang", nextLang);
    document.documentElement.lang = nextLang === "de" ? "de" : "zh-TW";
  }

  function selectTimelineItem(nextActive, event) {
    setActive(nextActive);
    event.currentTarget.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }

  function scrollToTimelineDay(dayIndex) {
    requestAnimationFrame(() => {
      layoutRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
      requestAnimationFrame(() => {
        dayTimelineRefs.current[dayIndex]?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
      });
    });
  }

  function selectFirstDayForCity(city) {
    let cityIndex = itineraryData.days.findIndex((day) => day.city === city.label || day.cityDe === city.labelDe);
    if (cityIndex < 0) {
      cityIndex = itineraryData.days.findIndex((day) => {
        const dayText = [day.title, day.titleDe, day.city, day.cityDe, ...day.blocks.flatMap((block) => [block.html, block.htmlDe])].join(" ");
        return dayText.includes(city.label) || dayText.includes(city.labelDe);
      });
    }
    if (cityIndex >= 0) {
      setActive(String(cityIndex));
      scrollToTimelineDay(cityIndex);
    }
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <nav className="topbar">
          <div />
          <div className="language-switch" aria-label="Language switch">
            <button className={lang === "zh" ? "active" : ""} type="button" onClick={() => changeLang("zh")}>中文</button>
            <button className={lang === "de" ? "active" : ""} type="button" onClick={() => changeLang("de")}>Deutsch</button>
          </div>
        </nav>
        <div className="hero-copy">
          <h1>{lang === "de" ? "Hokkaido Japan: 8 Tage" : "日本北海道8日遊"}</h1>
          <div className="city-tags">
            {itineraryData.cities.map((city) => (
              <button key={city.name} type="button" onClick={() => selectFirstDayForCity(city)}>
                <strong>{city.label}</strong>
                <small>{city.labelDe}</small>
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="layout" ref={layoutRef}>
        <aside className="timeline" aria-label="Itinerary timeline">
          <button className={active === "overview" ? "timeline-item active" : "timeline-item"} type="button" onClick={(event) => selectTimelineItem("overview", event)}>
            <span className="timeline-dot timeline-map-dot"><Map size={25} strokeWidth={2.5} /></span>
            <span><strong>{lang === "de" ? "Übersicht" : "總覽"}</strong><small>{lang === "de" ? "Reiseinfos" : "行程資訊"}</small></span>
          </button>
          {itineraryData.days.map((day, index) => (
            <button
              className={active === String(index) ? "timeline-item active" : "timeline-item"}
              type="button"
              key={`${day.date}-${day.title}`}
              ref={(element) => {
                dayTimelineRefs.current[index] = element;
              }}
              onClick={(event) => selectTimelineItem(String(index), event)}
            >
              <span className="timeline-dot">{index + 1}</span>
              <span><strong>{day.date}</strong><small>{lang === "de" ? day.cityDe : day.city}</small></span>
            </button>
          ))}
        </aside>

        <section className="content-stage">
          {active === "overview" ? <Overview lang={lang} /> : <DayDetail day={activeDay} index={Number(active)} lang={lang} />}
        </section>
      </div>
    </div>
  );
}
