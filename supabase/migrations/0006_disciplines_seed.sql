-- 0006_disciplines_seed.sql
-- System disciplines and their payload schemas.
--
-- This is reference data, not demo data, so it belongs in a migration: every
-- tenant gets these on day one. Fake assets and surveys live in supabase/seed.sql
-- instead, and never ship to a real deployment.
--
-- Note what adding a discipline costs here: one insert, one JSON Schema. No new
-- table, no migration to inspections or findings, no change to the dashboard.
-- That is the whole point of the payload design.

insert into public.disciplines (org_id, code, name, description, colour, icon) values
  (null, 'asbestos',   'Asbestos',            'Management of asbestos-containing materials under the Control of Asbestos Regulations.', 'amber',   'shield-alert'),
  (null, 'fire',       'Fire Safety',         'Fire risk assessments, compartmentation, detection and suppression.',                     'red',     'flame'),
  (null, 'legionella', 'Legionella',          'Water hygiene and legionella risk under ACOP L8.',                                         'sky',     'droplets'),
  (null, 'electrical', 'Electrical',          'Fixed wire testing, PAT and electrical safety inspections.',                               'yellow',  'zap'),
  (null, 'gas',        'Gas',                 'Gas safety inspections and appliance servicing.',                                          'orange',  'flame-kindling'),
  (null, 'ventilation','Ventilation',         'LEV testing, air handling and indoor air quality.',                                        'teal',    'wind'),
  (null, 'roof',       'Roof Inspections',    'Roof condition, access safety and fall protection.',                                       'slate',   'home'),
  (null, 'structural', 'Structural Surveys',  'Structural condition surveys and defect monitoring.',                                      'violet',  'building-2')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Asbestos
--
-- Modelled on HSG264. The material assessment is the sum of four scored factors
-- (product type, damage, surface treatment, asbestos type), each 0-3, giving
-- 0-12. That scoring is asbestos-specific and lives here in the schema rather
-- than as columns on `findings`.
-- ---------------------------------------------------------------------------

insert into public.discipline_schemas (discipline_id, target, version, json_schema)
select id, 'finding', 1, $json${
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Asbestos finding payload",
  "type": "object",
  "required": ["product_type", "asbestos_type", "extent_value", "extent_unit"],
  "additionalProperties": false,
  "properties": {
    "product_type": {
      "type": "string",
      "title": "Product type",
      "enum": ["lagging", "sprayed_coating", "insulating_board", "millboard", "rope_gasket", "cement", "textured_coating", "floor_tile", "bitumen", "other"]
    },
    "asbestos_type": {
      "type": "array",
      "title": "Asbestos type",
      "items": { "type": "string", "enum": ["chrysotile", "amosite", "crocidolite", "tremolite", "actinolite", "anthophyllite"] },
      "minItems": 1
    },
    "extent_value": { "type": "number", "title": "Extent", "minimum": 0 },
    "extent_unit": { "type": "string", "enum": ["m2", "m", "item"] },
    "condition": { "type": "string", "enum": ["good", "low_damage", "medium_damage", "high_damage"] },
    "surface_treatment": { "type": "string", "enum": ["composite", "enclosed", "sealed", "unsealed"] },
    "accessibility": { "type": "string", "enum": ["easily_accessible", "accessible", "restricted", "inaccessible"] },
    "material_assessment": {
      "type": "object",
      "title": "HSG264 material assessment",
      "additionalProperties": false,
      "properties": {
        "product_type_score": { "type": "integer", "minimum": 0, "maximum": 3 },
        "damage_score": { "type": "integer", "minimum": 0, "maximum": 3 },
        "surface_treatment_score": { "type": "integer", "minimum": 0, "maximum": 3 },
        "asbestos_type_score": { "type": "integer", "minimum": 0, "maximum": 3 },
        "total": { "type": "integer", "minimum": 0, "maximum": 12 }
      }
    },
    "recommendation": { "type": "string", "enum": ["manage", "monitor", "encapsulate", "remove", "further_survey"] },
    "sample_reference": { "type": "string" },
    "analysed_at": { "type": "string", "format": "date" }
  }
}$json$::jsonb
from public.disciplines where code = 'asbestos' and org_id is null;

insert into public.discipline_schemas (discipline_id, target, version, json_schema)
select id, 'inspection', 1, $json${
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Asbestos inspection payload",
  "type": "object",
  "required": ["survey_type"],
  "additionalProperties": false,
  "properties": {
    "survey_type": { "type": "string", "enum": ["management", "refurbishment", "demolition", "reinspection"] },
    "surveyor_licence": { "type": "string" },
    "laboratory": { "type": "string" },
    "areas_surveyed": { "type": "array", "items": { "type": "string" } },
    "areas_not_accessed": { "type": "array", "items": { "type": "string" } },
    "caveats": { "type": "string" }
  }
}$json$::jsonb
from public.disciplines where code = 'asbestos' and org_id is null;

-- ---------------------------------------------------------------------------
-- Fire safety
--
-- Completely different vocabulary to asbestos, same two tables underneath.
-- ---------------------------------------------------------------------------

insert into public.discipline_schemas (discipline_id, target, version, json_schema)
select id, 'finding', 1, $json${
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Fire safety finding payload",
  "type": "object",
  "required": ["element_type"],
  "additionalProperties": false,
  "properties": {
    "element_type": {
      "type": "string",
      "enum": ["fire_door", "compartment_wall", "detection", "alarm", "emergency_lighting", "extinguisher", "sprinkler", "escape_route", "signage"]
    },
    "defect_type": { "type": "string", "enum": ["missing", "damaged", "obstructed", "expired", "non_compliant", "untested"] },
    "fire_rating_minutes": { "type": "integer", "enum": [30, 60, 90, 120, 240] },
    "standard_reference": { "type": "string", "title": "e.g. BS 9999, IS 3218" },
    "occupancy_risk": { "type": "string", "enum": ["low", "normal", "high", "sleeping"] },
    "remedial_priority": { "type": "string", "enum": ["immediate", "urgent", "planned", "advisory"] }
  }
}$json$::jsonb
from public.disciplines where code = 'fire' and org_id is null;

insert into public.discipline_schemas (discipline_id, target, version, json_schema)
select id, 'inspection', 1, $json${
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Fire safety inspection payload",
  "type": "object",
  "required": ["assessment_type"],
  "additionalProperties": false,
  "properties": {
    "assessment_type": { "type": "string", "enum": ["fire_risk_assessment", "door_survey", "alarm_test", "compartmentation_survey", "drill"] },
    "assessor_competency": { "type": "string" },
    "occupancy_type": { "type": "string" },
    "max_occupancy": { "type": "integer", "minimum": 0 },
    "overall_risk_rating": { "type": "string", "enum": ["trivial", "tolerable", "moderate", "substantial", "intolerable"] }
  }
}$json$::jsonb
from public.disciplines where code = 'fire' and org_id is null;

-- ---------------------------------------------------------------------------
-- Legionella
--
-- Numeric readings rather than categorical scores. Third vocabulary, still no
-- schema change.
-- ---------------------------------------------------------------------------

insert into public.discipline_schemas (discipline_id, target, version, json_schema)
select id, 'finding', 1, $json${
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Legionella finding payload",
  "type": "object",
  "required": ["outlet_type"],
  "additionalProperties": false,
  "properties": {
    "outlet_type": { "type": "string", "enum": ["tap", "shower", "calorifier", "cold_tank", "tmv", "dead_leg", "cooling_tower"] },
    "issue_type": { "type": "string", "enum": ["temperature_out_of_range", "positive_sample", "dead_leg", "scale", "no_flushing_record", "tank_condition"] },
    "temperature_c": { "type": "number", "minimum": -10, "maximum": 100 },
    "temperature_target_c": { "type": "number" },
    "sample_result_cfu_per_litre": { "type": "integer", "minimum": 0 },
    "sample_reference": { "type": "string" },
    "sampled_at": { "type": "string", "format": "date" }
  }
}$json$::jsonb
from public.disciplines where code = 'legionella' and org_id is null;

insert into public.discipline_schemas (discipline_id, target, version, json_schema)
select id, 'inspection', 1, $json${
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Legionella inspection payload",
  "type": "object",
  "required": ["assessment_type"],
  "additionalProperties": false,
  "properties": {
    "assessment_type": { "type": "string", "enum": ["risk_assessment", "monitoring_visit", "sampling", "tank_inspection"] },
    "system_type": { "type": "string", "enum": ["hot_and_cold", "cooling_tower", "spa", "other"] },
    "outlets_tested": { "type": "integer", "minimum": 0 },
    "outlets_out_of_range": { "type": "integer", "minimum": 0 },
    "overall_risk_rating": { "type": "string", "enum": ["low", "medium", "high"] }
  }
}$json$::jsonb
from public.disciplines where code = 'legionella' and org_id is null;
