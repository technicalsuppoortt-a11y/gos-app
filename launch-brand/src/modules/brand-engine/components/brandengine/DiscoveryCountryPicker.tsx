import { useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Globe2, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/modules/brand-engine/components/ui/dialog";
import { countryRegions } from "@/modules/brand-engine/data/countryPickerData";
import { CountryFlag } from "./CountryFlag";

// Reuse the project's country list, including ISO territories not grouped in the regional picker.
const countryCodes = [
  ...new Set([
    ...countryRegions.flatMap((region) => region.codes),
    ..."AS AI AQ AW AX BL BM BQ BV CC CK CW CX EH FK FO GF GG GI GL GP GS GU HK HM IM IO JE KY MF MO MP MQ MS NC NF NU PF PM PN PR RE SH SJ SX TC TF TK UM VG VI WF YT AC TA XK".split(
      " ",
    ),
  ]),
];
export function DiscoveryCountryPicker({
  open,
  setOpen,
  value,
  select,
  ar,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  value: string;
  select: (code: string) => void;
  ar: boolean;
}) {
  const [search, setSearch] = useState(""),
    [page, setPage] = useState(0);
  const countries = useMemo(() => {
    const en = new Intl.DisplayNames(["en"], { type: "region" }),
      arabic = new Intl.DisplayNames(["ar"], { type: "region" });
    return countryCodes
      .map((code) => ({ code, en: en.of(code) || code, ar: arabic.of(code) || code }))
      .sort((a, b) => (ar ? a.ar : a.en).localeCompare(ar ? b.ar : b.en, ar ? "ar" : "en"));
  }, [ar]);
  const filtered = countries.filter((country) =>
    `${country.code} ${country.en} ${country.ar}`
      .toLocaleLowerCase()
      .includes(search.trim().toLocaleLowerCase()),
  );
  const last = Math.max(0, Math.ceil(filtered.length / 12) - 1),
    current = Math.min(page, last);
  const choose = (code: string) => {
    select(code);
    setOpen(false);
    setSearch("");
    setPage(0);
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setSearch("");
          setPage(0);
        }
      }}
    >
      <DialogContent className="discover-country-dialog" dir={ar ? "rtl" : "ltr"}>
        <DialogTitle>{ar ? "اختر الدولة المستهدفة" : "Choose your target country"}</DialogTitle>
        <DialogDescription>
          {ar
            ? "ابحث عن أي دولة بالاسم أو رمز الدولة."
            : "Search any country by name or country code."}
        </DialogDescription>
        <label className="discover-country-search">
          <Search />
          <input
            aria-label={ar ? "البحث عن دولة" : "Search countries"}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(0);
            }}
            placeholder={ar ? "اسم الدولة…" : "Search countries…"}
          />
        </label>
        <button
          type="button"
          className="discover-worldwide"
          aria-pressed={value === "GLOBAL"}
          onClick={() => choose("GLOBAL")}
        >
          <Globe2 />
          {ar ? "جميع الأسواق حول العالم" : "Worldwide — all markets"}
          {value === "GLOBAL" && <Check />}
        </button>
        <div className="discover-country-grid">
          {filtered.slice(current * 12, current * 12 + 12).map((country) => (
            <button
              type="button"
              key={country.code}
              title={ar ? country.ar : country.en}
              aria-pressed={value === country.code}
              onClick={() => choose(country.code)}
            >
              <CountryFlag code={country.code} />
              <span>{ar ? country.ar : country.en}</span>
              {value === country.code && <Check />}
            </button>
          ))}
          {!filtered.length && (
            <p role="status">
              {ar ? "لا توجد دولة مطابقة للبحث." : "No countries match your search."}
            </p>
          )}
        </div>
        <div className="discover-country-pagination">
          <small>
            {filtered.length} {ar ? "دولة ومنطقة" : "countries & regions"}
          </small>
          <div>
            <button
              type="button"
              aria-label="Previous countries"
              disabled={!current}
              onClick={() => setPage(current - 1)}
            >
              <ChevronLeft />
            </button>
            <span>
              {current + 1}/{last + 1}
            </span>
            <button
              type="button"
              aria-label="Next countries"
              disabled={current === last}
              onClick={() => setPage(current + 1)}
            >
              <ChevronRight />
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
