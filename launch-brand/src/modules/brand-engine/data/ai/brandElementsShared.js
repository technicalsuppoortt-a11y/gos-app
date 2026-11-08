// Shared pure contracts for the browser and the compatibility Functions runtime.
// Deliberately no provider credentials, persistence, or side effects.
export function createBrandElementContracts({ fonts, obj, str, candidateSchema, themeSchema, validateCandidates, prompt }) {
  const arabicFonts = themeSchema.properties.typography.properties.arabic.enum;
  const elements = ["name", "tagline", "colors", "typography", "logo"];
  const coreSchema = obj(Object.fromEntries(["primary", "secondary", "buttonBackground"].map(k => [k, { type: "string", pattern: "^#[0-9a-fA-F]{6}$", ...(k === "buttonBackground" ? { enum: ["#FFFFFF"] } : {}) }])));
  const fields = {
    name: { name: { ...str, maxLength: 80 } },
    tagline: { tagline: { ...str, maxLength: 160 } },
    colors: { coreColors: coreSchema },
    typography: { typography: themeSchema.properties.typography },
    logo: { mark: candidateSchema.properties.mark, logo: candidateSchema.properties.logo },
  };
  const elementSchema = element => {
    if (!elements.includes(element)) throw new Error("Unsupported brand element.");
    const count = element === "name" ? 15 : element === "logo" ? 1 : 3;
    // Allow resolved contours; do not force every concept into a tiny icon budget.
    const outputFields = element === "logo" ? { ...fields.logo, logo: obj({
      ...candidateSchema.properties.logo.properties,
      concept: { type: "string", maxLength: 160 },
      paths: { ...candidateSchema.properties.logo.properties.paths, minItems: 0, maxItems: 8,
        items: obj({ ...candidateSchema.properties.logo.properties.paths.items.properties,
          d: { type: "string", maxLength: 1800 } }),
      },
    }) } : fields[element];
    return obj({ suggestions: { type: "array", minItems: count, maxItems: count, items: obj({ ...outputFields, rationale: { ...str, maxLength: element === "logo" ? 160 : 400 } }) } });
  };
  const { theme: _theme, ...directionFields } = candidateSchema.properties;
  const directionSchema = obj({ candidates: { type: "array", minItems: 3, maxItems: 3, items: obj({ ...directionFields, coreColors: coreSchema, typography: themeSchema.properties.typography }) } });
  const normalizeAnswers = answers => {
    if (!answers || typeof answers !== "object" || Array.isArray(answers)) throw new Error("Invalid element answers.");
    const result = {};
    for (const key of ["preference", "detail", "interest"]) {
      const value = answers[key] ?? "";
      if (typeof value !== "string" || value.length > (key === "interest" ? 200 : 400)) throw new Error("Element answers are too long.");
      result[key] = value.trim();
    }
    result.nameLength = answers.nameLength === "one" ? "one" : "two";
    return result;
  };
  const coreColors = value => {
    if (!value || typeof value !== "object") throw new Error("Invalid core colors.");
    return Object.fromEntries(["primary", "secondary", "buttonBackground"].map(key => {
      let color = typeof value[key] === "string" ? value[key].trim() : "";
      if (/^#[0-9a-f]{3}$/i.test(color)) color = "#" + color.slice(1).split("").map(v => v + v).join("");
      if (!/^#[0-9a-f]{6}$/i.test(color)) throw new Error("Invalid core color.");
      return [key, key === "buttonBackground" ? "#FFFFFF" : color.toUpperCase()];
    }));
  };
  function themeFromCoreColors(value, base, paletteId = "custom") {
    const c = coreColors(value);
    const luminance = hex => hex.slice(1).match(/.{2}/g).map(v => {
      const n = parseInt(v, 16) / 255;
      return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4;
    }).reduce((sum, n, i) => sum + n * [.2126, .7152, .0722][i], 0);
    const buttonLuminance = luminance(c.buttonBackground), darkLuminance = luminance("#11152D");
    const darkContrast = (Math.max(buttonLuminance, darkLuminance) + .05) / (Math.min(buttonLuminance, darkLuminance) + .05);
    const onPrimary = darkContrast > 1.05 / (buttonLuminance + .05) ? "#11152D" : "#FFFFFF";
    const footerBackground = `#${[1, 3, 5].map(i => Math.round(parseInt(c.secondary.slice(i, i + 2), 16) * .2 + 12 * .8).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
    const common = { ...c, onPrimary, footerBackground, focus: c.primary };
    return {
      version: 1, paletteId,
      light: { ...common, background: "#F8FAFC", headerBackground: "#F8FAFC", surface: "#FFFFFF", text: "#11152D", mutedText: "#596579", border: "#CBD5E1", success: "#047857", warning: "#B45309", error: "#BE123C" },
      dark: { ...common, background: "#08131F", headerBackground: "#08131F", surface: "#101E2E", text: "#EDF2FA", mutedText: "#A5B3C7", border: "#334155", success: "#34D399", warning: "#FBBF24", error: "#FB7185" },
      typography: base?.typography || { heading: "Manrope", body: "Manrope", arabic: "Cairo" },
      buttons: base?.buttons || { variant: "solid", shape: "rounded" },
      appearance: base?.appearance || { radius: 14, shadow: "soft", density: "comfortable" },
    };
  }
  const typography = (value, brief) => {
    if (!value || !fonts.includes(value.heading) || !fonts.includes(value.body) || !arabicFonts.includes(value.arabic)) throw new Error("Invalid typography.");
    if (brief?.language === "Arabic" && ![value.heading, value.body].every(f => arabicFonts.includes(f))) throw new Error("Invalid Arabic typography.");
    return { heading: value.heading, body: value.body, arabic: value.arabic };
  };
  const text = (value, max) => {
    if (typeof value !== "string" || !value.trim() || value.length > max) throw new Error("Invalid brand suggestion text.");
    return value.trim();
  };
  const validateLogo = logo => {
    const w = logo.wordmark;
    if (!w || !fonts.includes(w.font) || ![400, 500, 600, 700, 800].includes(w.weight) ||
        !Number.isFinite(w.letterSpacing) || w.letterSpacing < -1 || w.letterSpacing > 4 ||
        !["original", "uppercase", "lowercase"].includes(w.casing) || typeof w.separator !== "boolean" ||
        typeof w.descriptor !== "string" || w.descriptor.length > 60)
      throw new Error("Invalid logo wordmark.");
    if (typeof logo.concept !== "string" || !logo.concept.trim() || logo.concept.length > 400 ||
        !Array.isArray(logo.paths) || logo.paths.length > 8)
      throw new Error("Invalid generated logo.");
    return { concept: logo.concept.trim(), wordmark: { ...w, descriptor: w.descriptor.trim() },
      paths: logo.paths.map(path => {
        if (!path || typeof path.d !== "string" || path.d.length > 1800 ||
            !/^[Mm][MmLlHhVvCcSsQqTtAaZz0-9eE,.+\s-]+$/.test(path.d) ||
            typeof path.fill !== "boolean" || !Number.isFinite(path.strokeWidth) ||
            path.strokeWidth < 0 || path.strokeWidth > 12 || (!path.fill && !path.strokeWidth))
          throw new Error("Invalid generated logo path.");
        const numbers = path.d.match(/[-+]?(?:\d*\.)?\d+(?:[eE][-+]?\d+)?/g) || [];
        if (!numbers.length || numbers.some(value => !Number.isFinite(Number(value)) || Math.abs(Number(value)) > 500))
          throw new Error("Invalid generated logo coordinates.");
        return { d: path.d, fill: path.fill, strokeWidth: path.strokeWidth };
      }),
    };
  };
  function validateElementSuggestions(result, element, requestId, brief, answers = {}) {
    if (result && typeof result === "object" && !Array.isArray(result.suggestions)) result = { ...result, suggestions: result.candidates || result.alternatives || (element === "name" ? result.names : element === "logo" ? result.logos : undefined) };
    const expectedCount = element === "name" ? 15 : element === "logo" ? 1 : 3;
    if (!elements.includes(element) || !Array.isArray(result?.suggestions) || result.suggestions.length !== expectedCount) throw new Error(`Expected ${expectedCount} brand element suggestions.`);
    const suggestions = result.suggestions.map((item, index) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error("Invalid brand suggestion text.");
      const explanation = item.rationale ?? item.reason ?? (element === "logo" ? item.logo?.concept : undefined);
      const result = { id: `${requestId}-${index}`, rationale: text(element === "logo" && typeof explanation === "string" ? explanation.trim().slice(0, 400) : explanation, 400) };
      // Do not carry extra AI fields into state: a name suggestion cannot mutate colors.
      if (element === "name") {
        result.name = text(item.name ?? item.brandName, 80);
        const words = result.name.trim().split(/\s+/).length;
        const expectedWords = answers.nameLength === "one" ? 1 : 2;
        if (words !== expectedWords) throw new Error("Generated name does not match the selected word count.");
        if (/^(brand name|your brand|اسم البراند|اسم العلامة التجارية)$/i.test(result.name)) throw new Error("Placeholder brand name.");
        const language = ["Arabic", "English"].includes(answers.preference) ? answers.preference : brief?.language;
        const letters = result.name.match(/\p{L}/gu) || [];
        if (!letters.length || (language === "Arabic" && letters.some(letter => !/\p{Script=Arabic}/u.test(letter))) ||
          (language === "English" && letters.some(letter => !/\p{Script=Latin}/u.test(letter)))) throw new Error("Wrong name language.");
      }
      if (element === "tagline") result.tagline = text(item.tagline, 160);
      if (element === "colors") result.coreColors = coreColors(item.coreColors);
      if (element === "typography") result.typography = typography(item.typography, brief);
      if (element === "logo") {
        if (!brief?.theme) throw new Error("Choose brand colors before generating a logo.");
        const generatedLogo = item.logo;
        if (!generatedLogo || !Array.isArray(generatedLogo.paths)) throw new Error("Invalid generated logo.");
        if (answers.preference === "Wordmark" && generatedLogo.paths.length)
          throw new Error("Wordmark logos must contain lettering only, without a separate symbol.");
        const chosenFont = brief.language === "Arabic" ? brief.theme.typography.arabic : brief.theme.typography.heading;
        const suppliedWordmark = generatedLogo.wordmark || {};
        if (suppliedWordmark.font && !fonts.includes(suppliedWordmark.font)) throw new Error("Invalid logo wordmark.");
        if (!generatedLogo.paths.length && brief.language === "Arabic" && suppliedWordmark.font && !arabicFonts.includes(suppliedWordmark.font)) throw new Error("Invalid Arabic logo wordmark.");
        const concept = generatedLogo.concept || result.rationale;
        const normalizedLogo = { ...generatedLogo, concept: typeof concept === "string" ? concept.trim().slice(0, 400) : concept, wordmark: { weight: 700, letterSpacing: 0, casing: "original", ...suppliedWordmark, font: generatedLogo.paths.length ? chosenFont : suppliedWordmark.font || chosenFont, ...(brief.language === "Arabic" ? { casing: "original", letterSpacing: 0 } : {}), separator: false, descriptor: "" }, paths: generatedLogo.paths.map(path => path && path.fill === true && path.strokeWidth === undefined ? { ...path, strokeWidth: 0 } : path) };
        // Some providers return the selected style instead of the legacy renderer
        // identifier. Preserve the validated custom artwork in either case.
        const markKey = typeof item.mark === "string" ? item.mark.trim().toLowerCase().replace(/[\s_]+/g, "-") : item.mark;
        const mark = ({ geometric: "prism", minimal: "prism", monogram: "serif", organic: "flow", connected: "nodes", emblem: "burst",
          wordmark: "prism", "negative-space": "prism", abstract: "prism", pictorial: "flow", luxury: "serif", vintage: "serif",
          modern: "prism", bold: "burst", friendly: "flow", tech: "nodes", "line-art": "flow" })[markKey] || markKey || "prism";
        if (!candidateSchema.properties.mark.enum.includes(mark)) throw new Error("Invalid logo renderer.");
        result.logo = validateLogo(normalizedLogo);
        result.mark = mark;
      }
      return result;
    });
    // Compare actual artwork, not its explanation or lettering settings. Normalize
    // separators and numeric spelling so formatting cannot disguise duplicates.
    const logoSignature = logo => !logo.paths.length ? JSON.stringify(logo.wordmark) : JSON.stringify(logo.paths.map(path => ({
      d: (path.d.match(/[A-Za-z]|[-+]?(?:\d*\.)?\d+(?:[eE][-+]?\d+)?/g) || [])
        .map(token => /^[A-Za-z]$/.test(token) ? token : Number(token)).join(" "),
      fill: path.fill,
      strokeWidth: path.strokeWidth,
    })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))));
    const signatures = suggestions.map(s => element === "name" ? s.name.replace(/\s+/g, " ").toLocaleLowerCase() : element === "tagline" ? s.tagline.replace(/\s+/g, " ").toLocaleLowerCase() : element === "logo" ? logoSignature(s.logo) : JSON.stringify(s[element === "colors" ? "coreColors" : "typography"]));
    if (new Set(signatures).size !== expectedCount) throw new Error(`Expected ${expectedCount} distinct suggestions.`);
    return suggestions;
  }
  function adaptDirectionResult(result, requestId, brief) {
    if (!Array.isArray(result?.candidates)) throw new Error("Invalid directions.");
    return { candidates: result.candidates.map((candidate, i) => ({ ...candidate, theme: {
      ...themeFromCoreColors(candidate.coreColors || candidate.theme?.light, brief.theme, `${requestId.slice(0, 30)}-${i}`),
      typography: typography(candidate.typography || candidate.theme?.typography, brief),
    } })) };
  }
  const elementInstruction = prompt.instructions.join("\n");
  const fingerprint = (base, element, answers) => {
    if (!elements.includes(element)) throw new Error("Unsupported brand element.");
    return JSON.stringify({ base, element, answers: normalizeAnswers(answers), promptVersion: prompt.version });
  };
  return { brandElementSchema: elementSchema, brandDirectionSchema: directionSchema, normalizeElementAnswers: normalizeAnswers, themeFromCoreColors, validateElementSuggestions, adaptDirectionResult, elementInstruction, brandElementFingerprint: fingerprint, brandElementPromptVersion: prompt.version };
}
