/**
 * Demo dataset.
 *
 * Entirely invented. No real organisation's asset data appears here — the sites
 * are fictional places, the references are made up, and the coordinates are
 * scattered around Ireland to make the map interesting.
 *
 * This exists so the UI is browsable before Supabase is connected. It is
 * deliberately confined behind the same functions in ./index.ts that the real
 * queries use, so deleting this file is the only cleanup needed once the
 * database is live.
 */

import type {
  Asset,
  AssetComplianceStatus,
  Discipline,
  DocumentRecord,
  Finding,
  FindingSeverity,
  FindingStatus,
  Inspection,
  Site,
} from "@/lib/types";

/** Deterministic PRNG (mulberry32) so demo data is stable across reloads. */
function rng(seed: number) {
  return function next() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = rng(20260717);
const pick = <T,>(items: readonly T[]): T =>
  items[Math.floor(rand() * items.length)];
const randInt = (min: number, max: number) =>
  Math.floor(rand() * (max - min + 1)) + min;

function isoDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export const DEMO_ORG = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Demo Utilities Group",
  slug: "demo",
};

export const demoDisciplines: Discipline[] = [
  { id: "d-asbestos", code: "asbestos", name: "Asbestos", description: "Management of asbestos-containing materials.", colour: "amber", icon: "shield-alert", is_active: true },
  { id: "d-fire", code: "fire", name: "Fire Safety", description: "Fire risk assessments and compartmentation.", colour: "red", icon: "flame", is_active: true },
  { id: "d-legionella", code: "legionella", name: "Legionella", description: "Water hygiene under ACOP L8.", colour: "sky", icon: "droplets", is_active: true },
  { id: "d-electrical", code: "electrical", name: "Electrical", description: "Fixed wire testing and PAT.", colour: "yellow", icon: "zap", is_active: true },
  { id: "d-gas", code: "gas", name: "Gas", description: "Gas safety inspections.", colour: "orange", icon: "flame-kindling", is_active: true },
  { id: "d-ventilation", code: "ventilation", name: "Ventilation", description: "LEV testing and air quality.", colour: "teal", icon: "wind", is_active: true },
  { id: "d-roof", code: "roof", name: "Roof Inspections", description: "Roof condition and fall protection.", colour: "slate", icon: "home", is_active: true },
  { id: "d-structural", code: "structural", name: "Structural Surveys", description: "Structural condition and defects.", colour: "violet", icon: "building-2", is_active: true },
];

export const demoSites: Site[] = [
  { id: "s-1", name: "Ballyclare Water Treatment Plant", code: "BCL-WTP", address: "Ballyclare, Co. Meath", region: "Eastern", latitude: 53.5241, longitude: -6.6412 },
  { id: "s-2", name: "Rathmore Wastewater Treatment Works", code: "RTM-WWTW", address: "Rathmore, Co. Kerry", region: "South West", latitude: 52.0873, longitude: -9.2214 },
  { id: "s-3", name: "Dromore Pumping Station", code: "DRM-PS", address: "Dromore, Co. Tipperary", region: "Southern", latitude: 52.6891, longitude: -7.8234 },
  { id: "s-4", name: "Kilbride Reservoir Complex", code: "KBR-RES", address: "Kilbride, Co. Wicklow", region: "Eastern", latitude: 53.1934, longitude: -6.3821 },
  { id: "s-5", name: "Newtown Regional Depot", code: "NTN-DEP", address: "Newtown, Co. Galway", region: "Western", latitude: 53.2712, longitude: -8.9143 },
  { id: "s-6", name: "Ashgrove Operations Centre", code: "ASH-OPS", address: "Ashgrove, Co. Cork", region: "Southern", latitude: 51.9012, longitude: -8.4712 },
];

const ASSET_TYPES = [
  { id: "at-1", name: "Administration Building", category: "building" },
  { id: "at-2", name: "Filtration Building", category: "building" },
  { id: "at-3", name: "Pump House", category: "building" },
  { id: "at-4", name: "Chemical Store", category: "building" },
  { id: "at-5", name: "Workshop", category: "building" },
  { id: "at-6", name: "Control Room", category: "building" },
  { id: "at-7", name: "Storage Shed", category: "structure" },
  { id: "at-8", name: "Welfare Facility", category: "building" },
];

const CONSTRUCTION_ERAS = [1958, 1964, 1971, 1976, 1982, 1988, 1994, 2001, 2008, 2015];

export const demoAssets: Asset[] = demoSites.flatMap((site, siteIndex) => {
  const count = randInt(3, 6);
  return Array.from({ length: count }, (_, i) => {
    const type = ASSET_TYPES[(siteIndex + i) % ASSET_TYPES.length];
    const year = pick(CONSTRUCTION_ERAS);
    return {
      id: `a-${siteIndex + 1}-${i + 1}`,
      reference: `${site.code}-${String(i + 1).padStart(3, "0")}`,
      name: `${type.name} ${i + 1}`,
      description: `${type.name} at ${site.name}, constructed circa ${year}.`,
      status: rand() > 0.9 ? ("inactive" as const) : ("active" as const),
      site_id: site.id,
      site_name: site.name,
      asset_type_id: type.id,
      asset_type_name: type.name,
      parent_id: null,
      // Scatter assets a little around the site centroid.
      latitude: (site.latitude ?? 53) + (rand() - 0.5) * 0.012,
      longitude: (site.longitude ?? -7) + (rand() - 0.5) * 0.018,
      attributes: {
        construction_year: year,
        floors: randInt(1, 3),
        floor_area_m2: randInt(80, 1400),
        // Pre-2000 buildings are the ones plausibly containing asbestos.
        asbestos_register_complete: year < 2000 ? rand() > 0.3 : true,
      },
      created_at: new Date(Date.now() - randInt(200, 900) * 86400000).toISOString(),
      updated_at: new Date(Date.now() - randInt(1, 60) * 86400000).toISOString(),
    };
  });
});

/**
 * Which disciplines apply to which asset. Asbestos only attaches to pre-2000
 * buildings, which is why the demo dashboard doesn't show a uniform grid.
 */
export const demoCompliance: AssetComplianceStatus[] = demoAssets.flatMap((asset) => {
  const year = Number(asset.attributes.construction_year ?? 2000);
  const applicable = demoDisciplines.filter((d) => {
    if (d.code === "asbestos") return year < 2000;
    if (d.code === "gas") return rand() > 0.55;
    if (d.code === "ventilation") return rand() > 0.5;
    if (d.code === "structural") return rand() > 0.6;
    return true;
  });

  return applicable.map((d) => {
    const frequency = d.code === "legionella" ? 6 : d.code === "fire" ? 12 : 12;
    const dueOffset = randInt(-120, 300);
    const state =
      dueOffset < 0 ? "overdue" : dueOffset < 30 ? "due_soon" : "compliant";
    return {
      asset_id: asset.id,
      discipline_id: d.id,
      discipline_code: d.code,
      discipline_name: d.name,
      frequency_months: frequency,
      last_inspection_at: isoDate(dueOffset - frequency * 30),
      next_due_date: isoDate(dueOffset),
      is_required: true,
      compliance_state: state as AssetComplianceStatus["compliance_state"],
      days_until_due: dueOffset,
    };
  });
});

const SEVERITIES: FindingSeverity[] = ["critical", "high", "medium", "low", "info"];
const OPEN_STATUSES: FindingStatus[] = ["open", "monitoring", "in_remediation"];

const ASBESTOS_TITLES = [
  "Asbestos insulating board ceiling tiles",
  "Chrysotile cement roof sheeting",
  "Lagging to heating pipework",
  "Textured coating to ceilings",
  "Asbestos cement flue",
  "Floor tiles with bitumen backing",
];

const FIRE_TITLES = [
  "Fire door lacking intumescent strip",
  "Compartment wall penetration unsealed",
  "Emergency lighting failed duration test",
  "Extinguisher beyond service date",
  "Escape route obstructed by storage",
];

const LEGIONELLA_TITLES = [
  "Outlet temperature below 50°C",
  "Dead leg identified on cold main",
  "Cold water tank lid not sealed",
  "No flushing records for infrequent outlet",
  "Positive legionella sample at shower",
];

const GENERIC_TITLES = [
  "Distribution board lacking current certificate",
  "LEV system overdue thorough examination",
  "Roof access hatch fall protection missing",
  "Spalling concrete to external column",
  "Gas appliance service overdue",
];

function titleFor(code: string): string {
  if (code === "asbestos") return pick(ASBESTOS_TITLES);
  if (code === "fire") return pick(FIRE_TITLES);
  if (code === "legionella") return pick(LEGIONELLA_TITLES);
  return pick(GENERIC_TITLES);
}

/** Discipline-specific payloads — the whole point of the JSONB design. */
function payloadFor(code: string): Record<string, unknown> {
  if (code === "asbestos") {
    const productTypeScore = randInt(1, 3);
    const damageScore = randInt(0, 3);
    const surfaceScore = randInt(0, 3);
    const typeScore = randInt(1, 3);
    return {
      product_type: pick(["insulating_board", "cement", "lagging", "textured_coating", "floor_tile"]),
      asbestos_type: [pick(["chrysotile", "amosite", "crocidolite"])],
      extent_value: randInt(1, 60),
      extent_unit: pick(["m2", "m", "item"]),
      condition: pick(["good", "low_damage", "medium_damage", "high_damage"]),
      surface_treatment: pick(["composite", "enclosed", "sealed", "unsealed"]),
      accessibility: pick(["easily_accessible", "accessible", "restricted"]),
      material_assessment: {
        product_type_score: productTypeScore,
        damage_score: damageScore,
        surface_treatment_score: surfaceScore,
        asbestos_type_score: typeScore,
        total: productTypeScore + damageScore + surfaceScore + typeScore,
      },
      recommendation: pick(["manage", "monitor", "encapsulate", "remove"]),
      sample_reference: `SMP-${randInt(1000, 9999)}`,
    };
  }
  if (code === "fire") {
    return {
      element_type: pick(["fire_door", "compartment_wall", "emergency_lighting", "extinguisher", "escape_route"]),
      defect_type: pick(["missing", "damaged", "obstructed", "expired", "non_compliant"]),
      fire_rating_minutes: pick([30, 60, 90, 120]),
      standard_reference: pick(["IS 3218:2013", "BS 9999", "IS EN 1634-1"]),
      occupancy_risk: pick(["low", "normal", "high"]),
      remedial_priority: pick(["immediate", "urgent", "planned", "advisory"]),
    };
  }
  if (code === "legionella") {
    const temp = randInt(28, 48);
    return {
      outlet_type: pick(["tap", "shower", "calorifier", "cold_tank", "tmv", "dead_leg"]),
      issue_type: pick(["temperature_out_of_range", "dead_leg", "scale", "no_flushing_record"]),
      temperature_c: temp,
      temperature_target_c: 50,
      sample_reference: `WS-${randInt(1000, 9999)}`,
      sampled_at: isoDate(-randInt(10, 200)),
    };
  }
  return { note: "See attached report for detail." };
}

const LOCATIONS = [
  "Boiler room, north wall",
  "First floor corridor",
  "Plant room ceiling void",
  "External roof, south elevation",
  "Ground floor welfare area",
  "Switch room",
  "Chemical dosing area",
  "Workshop mezzanine",
];

let findingSeq = 1000;

export const demoFindings: Finding[] = demoAssets.flatMap((asset) => {
  const disciplinesForAsset = demoCompliance.filter((c) => c.asset_id === asset.id);
  const out: Finding[] = [];

  for (let i = 0; i < randInt(0, 4); i++) {
    const c = pick(disciplinesForAsset);
    // An asset can have no applicable disciplines (nothing to find against).
    if (!c) continue;

    const status: FindingStatus =
      rand() > 0.72 ? pick(["remediated", "closed"] as FindingStatus[]) : pick(OPEN_STATUSES);
    findingSeq += 1;

    out.push({
      id: `f-${findingSeq}`,
      reference: `FND-${findingSeq}`,
      asset_id: asset.id,
      asset_name: asset.name,
      inspection_id: null,
      discipline_id: c.discipline_id,
      discipline_code: c.discipline_code,
      discipline_name: c.discipline_name,
      title: titleFor(c.discipline_code),
      description:
        "Identified during routine inspection. Recorded for management and periodic reassessment.",
      severity: pick(SEVERITIES),
      status,
      location_note: pick(LOCATIONS),
      identified_at: isoDate(-randInt(20, 700)),
      remediated_at:
        status === "remediated" || status === "closed" ? isoDate(-randInt(1, 19)) : null,
      payload: payloadFor(c.discipline_code),
      schema_version: 1,
    });
  }

  return out;
});

const INSPECTORS = ["A. Byrne", "M. O'Sullivan", "K. Doyle", "R. Fitzgerald", "S. Nolan"];

let inspectionSeq = 5000;

export const demoInspections: Inspection[] = demoCompliance
  .filter(() => rand() > 0.45)
  .map((c) => {
    const asset = demoAssets.find((a) => a.id === c.asset_id);
    const done = rand() > 0.3;
    inspectionSeq += 1;
    return {
      id: `i-${inspectionSeq}`,
      reference: `INS-${inspectionSeq}`,
      asset_id: c.asset_id,
      asset_name: asset?.name ?? null,
      discipline_id: c.discipline_id,
      discipline_code: c.discipline_code,
      discipline_name: c.discipline_name,
      inspector_name: pick(INSPECTORS),
      status: done ? "completed" : pick(["scheduled", "in_progress"] as const),
      scheduled_for: c.next_due_date,
      completed_at: done ? new Date(`${c.last_inspection_at}T10:00:00Z`).toISOString() : null,
      summary: done ? "Inspection completed. Findings recorded where applicable." : null,
      payload:
        c.discipline_code === "asbestos"
          ? { survey_type: pick(["management", "reinspection", "refurbishment"]), surveyor_licence: `LIC-${randInt(100, 999)}` }
          : c.discipline_code === "fire"
            ? { assessment_type: pick(["fire_risk_assessment", "door_survey", "alarm_test"]), overall_risk_rating: pick(["tolerable", "moderate", "substantial"]) }
            : { assessment_type: "routine" },
      schema_version: 1,
    } satisfies Inspection;
  });

const DOC_TITLES: Record<string, string[]> = {
  report: ["Management Survey Report", "Fire Risk Assessment", "Legionella Risk Assessment", "Structural Condition Report"],
  certificate: ["Electrical Installation Certificate", "Gas Safety Certificate", "LEV Thorough Examination"],
  drawing: ["Ground Floor Plan", "Site Layout Drawing", "Roof Plan"],
  photo: ["Ceiling void inspection", "External elevation", "Plant room overview", "Defect close-up", "Roof access point"],
  permit: ["Permit to Work", "Hot Works Permit"],
  other: ["Site Access Notes"],
};

let docSeq = 9000;

export const demoDocuments: DocumentRecord[] = demoAssets.flatMap((asset) => {
  const count = randInt(2, 6);
  return Array.from({ length: count }, () => {
    const kind = pick(["report", "certificate", "drawing", "photo", "photo", "permit", "other"] as const);
    const d = pick(demoDisciplines);
    docSeq += 1;
    const isPhoto = kind === "photo";
    return {
      id: `doc-${docSeq}`,
      title: `${pick(DOC_TITLES[kind])} — ${asset.reference}`,
      description: isPhoto ? "Site photograph captured during inspection." : "Uploaded compliance document.",
      kind,
      asset_id: asset.id,
      asset_name: asset.name,
      discipline_id: d.id,
      discipline_code: d.code,
      bucket: "documents",
      storage_path: `${DEMO_ORG.id}/${asset.id}/${docSeq}${isPhoto ? ".jpg" : ".pdf"}`,
      mime_type: isPhoto ? "image/jpeg" : "application/pdf",
      size_bytes: randInt(40_000, 8_000_000),
      width: isPhoto ? 1600 : null,
      height: isPhoto ? 1200 : null,
      taken_at: isPhoto ? new Date(Date.now() - randInt(1, 600) * 86400000).toISOString() : null,
      issued_at: isoDate(-randInt(30, 800)),
      expires_at: kind === "certificate" ? isoDate(randInt(-90, 400)) : null,
      uploaded_by_name: pick(INSPECTORS),
      created_at: new Date(Date.now() - randInt(1, 600) * 86400000).toISOString(),
      // Demo mode has no storage bucket, so photos render as generated
      // placeholders rather than fake-looking stock imagery.
      url: null,
    } satisfies DocumentRecord;
  });
});
