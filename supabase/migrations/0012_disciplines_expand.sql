-- 0012_disciplines_expand.sql
-- Fills in schema gaps flagged by an external compliance-officer review:
--
-- 1. Five disciplines seeded in 0006 (electrical, gas, ventilation, roof,
--    structural) had rows but no discipline_schemas, so real payloads for
--    them had nowhere to validate against. This gives them the same
--    finding + inspection schema pair the original three disciplines have.
-- 2. Five compliance areas were missing outright: COSHH, other hazardous
--    materials (lead paint, PCBs, mould -- distinct from the asbestos
--    discipline), accessibility, energy efficiency, and radiation safety.
--
-- Same rule as 0006: nothing discipline-specific becomes a core column.

-- ---------------------------------------------------------------------------
-- New disciplines
-- ---------------------------------------------------------------------------

insert into public.disciplines (org_id, code, name, description, colour, icon) values
  (null, 'coshh',         'COSHH',                'Control of substances hazardous to health: storage, handling and exposure control.', 'lime',    'flask-conical'),
  (null, 'hazmat',        'Hazardous Materials',  'Hazardous materials other than asbestos: lead paint, PCBs, mould, contaminated land.', 'rose',    'biohazard'),
  (null, 'accessibility', 'Accessibility',        'Accessibility audits against building regulations and universal design standards.',    'blue',    'accessibility'),
  (null, 'energy',        'Energy Efficiency',    'Energy performance certification, plant efficiency and metering.',                     'emerald', 'gauge'),
  (null, 'radiation',     'Radiation Safety',     'Radiation safety for sealed sources, gauging equipment and legacy sources.',            'fuchsia', 'radiation')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Electrical
-- ---------------------------------------------------------------------------

insert into public.discipline_schemas (discipline_id, target, version, json_schema)
select id, 'finding', 1, $json${
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Electrical finding payload",
  "type": "object",
  "required": ["element_type"],
  "additionalProperties": false,
  "properties": {
    "element_type": { "type": "string", "enum": ["distribution_board", "socket_outlet", "lighting_circuit", "portable_appliance", "fixed_installation", "earthing_bonding", "rcd", "isolator"] },
    "defect_code": { "type": "string", "title": "EICR classification", "enum": ["C1", "C2", "C3", "FI"] },
    "circuit_reference": { "type": "string" },
    "test_result": { "type": "string", "enum": ["pass", "fail", "not_tested"] },
    "remedial_priority": { "type": "string", "enum": ["immediate", "urgent", "planned", "advisory"] }
  }
}$json$::jsonb
from public.disciplines where code = 'electrical' and org_id is null;

insert into public.discipline_schemas (discipline_id, target, version, json_schema)
select id, 'inspection', 1, $json${
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Electrical inspection payload",
  "type": "object",
  "required": ["assessment_type"],
  "additionalProperties": false,
  "properties": {
    "assessment_type": { "type": "string", "enum": ["eicr", "pat_testing", "fixed_wire_test", "thermal_imaging"] },
    "installation_age_years": { "type": "integer", "minimum": 0 },
    "circuits_tested": { "type": "integer", "minimum": 0 },
    "overall_condition": { "type": "string", "enum": ["satisfactory", "unsatisfactory"] }
  }
}$json$::jsonb
from public.disciplines where code = 'electrical' and org_id is null;

-- ---------------------------------------------------------------------------
-- Gas
-- ---------------------------------------------------------------------------

insert into public.discipline_schemas (discipline_id, target, version, json_schema)
select id, 'finding', 1, $json${
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Gas finding payload",
  "type": "object",
  "required": ["appliance_type"],
  "additionalProperties": false,
  "properties": {
    "appliance_type": { "type": "string", "enum": ["boiler", "water_heater", "cooker", "gas_fire", "meter", "pipework"] },
    "defect_classification": { "type": "string", "title": "Gas Safe classification", "enum": ["immediately_dangerous", "at_risk", "not_to_current_standards", "advisory"] },
    "gas_type": { "type": "string", "enum": ["natural_gas", "lpg"] },
    "appliance_reference": { "type": "string" },
    "remedial_priority": { "type": "string", "enum": ["immediate", "urgent", "planned", "advisory"] }
  }
}$json$::jsonb
from public.disciplines where code = 'gas' and org_id is null;

insert into public.discipline_schemas (discipline_id, target, version, json_schema)
select id, 'inspection', 1, $json${
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Gas inspection payload",
  "type": "object",
  "required": ["assessment_type"],
  "additionalProperties": false,
  "properties": {
    "assessment_type": { "type": "string", "enum": ["landlord_gas_safety_check", "appliance_service", "pipework_test", "tightness_test"] },
    "engineer_licence": { "type": "string", "title": "Gas Safe / RGI licence number" },
    "appliances_tested": { "type": "integer", "minimum": 0 },
    "overall_result": { "type": "string", "enum": ["pass", "fail", "pass_with_defects"] }
  }
}$json$::jsonb
from public.disciplines where code = 'gas' and org_id is null;

-- ---------------------------------------------------------------------------
-- Ventilation
-- ---------------------------------------------------------------------------

insert into public.discipline_schemas (discipline_id, target, version, json_schema)
select id, 'finding', 1, $json${
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Ventilation finding payload",
  "type": "object",
  "required": ["system_type"],
  "additionalProperties": false,
  "properties": {
    "system_type": { "type": "string", "enum": ["lev", "ahu", "extract_fan", "ductwork", "hepa_filter"] },
    "defect_type": { "type": "string", "enum": ["airflow_below_threshold", "filter_overdue", "damaged_ductwork", "fan_failure", "no_test_record"] },
    "measured_airflow_m3s": { "type": "number", "minimum": 0 },
    "required_airflow_m3s": { "type": "number", "minimum": 0 },
    "remedial_priority": { "type": "string", "enum": ["immediate", "urgent", "planned", "advisory"] }
  }
}$json$::jsonb
from public.disciplines where code = 'ventilation' and org_id is null;

insert into public.discipline_schemas (discipline_id, target, version, json_schema)
select id, 'inspection', 1, $json${
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Ventilation inspection payload",
  "type": "object",
  "required": ["assessment_type"],
  "additionalProperties": false,
  "properties": {
    "assessment_type": { "type": "string", "enum": ["lev_thorough_examination", "air_quality_monitoring", "filter_replacement", "commissioning"] },
    "systems_tested": { "type": "integer", "minimum": 0 },
    "overall_result": { "type": "string", "enum": ["satisfactory", "unsatisfactory"] }
  }
}$json$::jsonb
from public.disciplines where code = 'ventilation' and org_id is null;

-- ---------------------------------------------------------------------------
-- Roof
-- ---------------------------------------------------------------------------

insert into public.discipline_schemas (discipline_id, target, version, json_schema)
select id, 'finding', 1, $json${
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Roof finding payload",
  "type": "object",
  "required": ["element_type"],
  "additionalProperties": false,
  "properties": {
    "element_type": { "type": "string", "enum": ["covering", "flashing", "drainage", "rooflight", "access_hatch", "fall_protection", "parapet"] },
    "defect_type": { "type": "string", "enum": ["leak", "ponding", "damaged_covering", "corrosion", "missing_guardrail", "blocked_outlet"] },
    "extent_value": { "type": "number", "minimum": 0 },
    "extent_unit": { "type": "string", "enum": ["m2", "m", "item"] },
    "remedial_priority": { "type": "string", "enum": ["immediate", "urgent", "planned", "advisory"] }
  }
}$json$::jsonb
from public.disciplines where code = 'roof' and org_id is null;

insert into public.discipline_schemas (discipline_id, target, version, json_schema)
select id, 'inspection', 1, $json${
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Roof inspection payload",
  "type": "object",
  "required": ["assessment_type"],
  "additionalProperties": false,
  "properties": {
    "assessment_type": { "type": "string", "enum": ["condition_survey", "access_safety_audit", "post_storm_inspection"] },
    "access_method": { "type": "string", "enum": ["ladder", "mewp", "rope_access", "permanent_walkway"] },
    "overall_condition": { "type": "string", "enum": ["good", "fair", "poor", "dangerous"] }
  }
}$json$::jsonb
from public.disciplines where code = 'roof' and org_id is null;

-- ---------------------------------------------------------------------------
-- Structural
-- ---------------------------------------------------------------------------

insert into public.discipline_schemas (discipline_id, target, version, json_schema)
select id, 'finding', 1, $json${
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Structural finding payload",
  "type": "object",
  "required": ["element_type"],
  "additionalProperties": false,
  "properties": {
    "element_type": { "type": "string", "enum": ["foundation", "column", "beam", "wall", "slab", "cladding", "joint"] },
    "defect_type": { "type": "string", "enum": ["cracking", "spalling", "corrosion", "deflection", "settlement", "water_ingress"] },
    "crack_width_mm": { "type": "number", "minimum": 0 },
    "movement_monitored": { "type": "boolean" },
    "remedial_priority": { "type": "string", "enum": ["immediate", "urgent", "planned", "advisory"] }
  }
}$json$::jsonb
from public.disciplines where code = 'structural' and org_id is null;

insert into public.discipline_schemas (discipline_id, target, version, json_schema)
select id, 'inspection', 1, $json${
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Structural inspection payload",
  "type": "object",
  "required": ["assessment_type"],
  "additionalProperties": false,
  "properties": {
    "assessment_type": { "type": "string", "enum": ["condition_survey", "structural_appraisal", "movement_monitoring", "load_assessment"] },
    "engineer_qualification": { "type": "string" },
    "overall_rating": { "type": "string", "enum": ["good", "fair", "poor", "critical"] }
  }
}$json$::jsonb
from public.disciplines where code = 'structural' and org_id is null;

-- ---------------------------------------------------------------------------
-- COSHH
-- ---------------------------------------------------------------------------

insert into public.discipline_schemas (discipline_id, target, version, json_schema)
select id, 'finding', 1, $json${
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "COSHH finding payload",
  "type": "object",
  "required": ["substance_category"],
  "additionalProperties": false,
  "properties": {
    "substance_category": { "type": "string", "enum": ["flammable", "corrosive", "toxic", "irritant", "oxidising", "carcinogenic", "environmentally_hazardous"] },
    "storage_issue": { "type": "string", "enum": ["incompatible_storage", "inadequate_ventilation", "missing_sds", "damaged_container", "missing_signage", "spill_kit_absent", "exceeds_storage_limit"] },
    "substance_name": { "type": "string" },
    "quantity_value": { "type": "number", "minimum": 0 },
    "quantity_unit": { "type": "string", "enum": ["litre", "kg", "tonne"] },
    "control_measures_adequate": { "type": "boolean" },
    "remedial_priority": { "type": "string", "enum": ["immediate", "urgent", "planned", "advisory"] }
  }
}$json$::jsonb
from public.disciplines where code = 'coshh' and org_id is null;

insert into public.discipline_schemas (discipline_id, target, version, json_schema)
select id, 'inspection', 1, $json${
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "COSHH inspection payload",
  "type": "object",
  "required": ["assessment_type"],
  "additionalProperties": false,
  "properties": {
    "assessment_type": { "type": "string", "enum": ["coshh_assessment", "storage_audit", "exposure_monitoring"] },
    "substances_assessed": { "type": "integer", "minimum": 0 },
    "overall_risk_rating": { "type": "string", "enum": ["low", "medium", "high"] }
  }
}$json$::jsonb
from public.disciplines where code = 'coshh' and org_id is null;

-- ---------------------------------------------------------------------------
-- Hazardous materials (other than asbestos)
-- ---------------------------------------------------------------------------

insert into public.discipline_schemas (discipline_id, target, version, json_schema)
select id, 'finding', 1, $json${
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Hazardous materials finding payload",
  "type": "object",
  "required": ["material_type"],
  "additionalProperties": false,
  "properties": {
    "material_type": { "type": "string", "enum": ["lead_paint", "pcb", "mould", "synthetic_mineral_fibre", "contaminated_land", "refrigerant_gas", "legacy_radioactive_source"] },
    "extent_value": { "type": "number", "minimum": 0 },
    "extent_unit": { "type": "string", "enum": ["m2", "m", "item"] },
    "condition": { "type": "string", "enum": ["good", "low_damage", "medium_damage", "high_damage"] },
    "sample_reference": { "type": "string" },
    "recommendation": { "type": "string", "enum": ["manage", "encapsulate", "remove", "further_survey"] }
  }
}$json$::jsonb
from public.disciplines where code = 'hazmat' and org_id is null;

insert into public.discipline_schemas (discipline_id, target, version, json_schema)
select id, 'inspection', 1, $json${
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Hazardous materials inspection payload",
  "type": "object",
  "required": ["survey_type"],
  "additionalProperties": false,
  "properties": {
    "survey_type": { "type": "string", "enum": ["material_survey", "refurbishment_survey", "remediation_verification"] },
    "surveyor_qualification": { "type": "string" },
    "laboratory": { "type": "string" }
  }
}$json$::jsonb
from public.disciplines where code = 'hazmat' and org_id is null;

-- ---------------------------------------------------------------------------
-- Accessibility
-- ---------------------------------------------------------------------------

insert into public.discipline_schemas (discipline_id, target, version, json_schema)
select id, 'finding', 1, $json${
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Accessibility finding payload",
  "type": "object",
  "required": ["element_type"],
  "additionalProperties": false,
  "properties": {
    "element_type": { "type": "string", "enum": ["entrance", "ramp", "stair", "lift", "door_width", "signage", "toilet_facility", "parking_bay", "hearing_loop"] },
    "barrier_type": { "type": "string", "enum": ["step_or_kerb", "insufficient_width", "missing_handrail", "poor_contrast", "missing_tactile_paving", "no_accessible_toilet", "no_designated_parking"] },
    "standard_reference": { "type": "string", "title": "e.g. IS EN 17210, Part M Building Regs" },
    "remedial_priority": { "type": "string", "enum": ["immediate", "urgent", "planned", "advisory"] }
  }
}$json$::jsonb
from public.disciplines where code = 'accessibility' and org_id is null;

insert into public.discipline_schemas (discipline_id, target, version, json_schema)
select id, 'inspection', 1, $json${
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Accessibility inspection payload",
  "type": "object",
  "required": ["assessment_type"],
  "additionalProperties": false,
  "properties": {
    "assessment_type": { "type": "string", "enum": ["access_audit", "part_m_compliance_review", "daat_review"] },
    "overall_rating": { "type": "string", "enum": ["compliant", "partially_compliant", "non_compliant"] }
  }
}$json$::jsonb
from public.disciplines where code = 'accessibility' and org_id is null;

-- ---------------------------------------------------------------------------
-- Energy efficiency
-- ---------------------------------------------------------------------------

insert into public.discipline_schemas (discipline_id, target, version, json_schema)
select id, 'finding', 1, $json${
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Energy finding payload",
  "type": "object",
  "required": ["system_type"],
  "additionalProperties": false,
  "properties": {
    "system_type": { "type": "string", "enum": ["building_fabric", "heating_system", "lighting", "controls", "renewable_generation", "metering"] },
    "issue_type": { "type": "string", "enum": ["poor_insulation", "inefficient_plant", "no_zoning_controls", "air_leakage", "outdated_lighting", "missing_sub_metering"] },
    "estimated_annual_cost_impact": { "type": "number", "minimum": 0 },
    "remedial_priority": { "type": "string", "enum": ["immediate", "urgent", "planned", "advisory"] }
  }
}$json$::jsonb
from public.disciplines where code = 'energy' and org_id is null;

insert into public.discipline_schemas (discipline_id, target, version, json_schema)
select id, 'inspection', 1, $json${
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Energy inspection payload",
  "type": "object",
  "required": ["assessment_type"],
  "additionalProperties": false,
  "properties": {
    "assessment_type": { "type": "string", "enum": ["energy_audit", "epc_assessment", "display_energy_certificate", "monitoring_targeting_review"] },
    "ber_rating": { "type": "string", "enum": ["A1", "A2", "A3", "B1", "B2", "B3", "C1", "C2", "C3", "D1", "D2", "E1", "E2", "F", "G"] },
    "annual_energy_use_kwh": { "type": "number", "minimum": 0 }
  }
}$json$::jsonb
from public.disciplines where code = 'energy' and org_id is null;

-- ---------------------------------------------------------------------------
-- Radiation safety
-- ---------------------------------------------------------------------------

insert into public.discipline_schemas (discipline_id, target, version, json_schema)
select id, 'finding', 1, $json${
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Radiation finding payload",
  "type": "object",
  "required": ["source_type"],
  "additionalProperties": false,
  "properties": {
    "source_type": { "type": "string", "enum": ["sealed_source", "x_ray_generator", "level_gauge", "moisture_density_gauge", "legacy_source", "naturally_occurring"] },
    "issue_type": { "type": "string", "enum": ["missing_licence", "shielding_defect", "leak_test_overdue", "dosimetry_lapse", "decommissioning_required"] },
    "activity_value": { "type": "number", "minimum": 0 },
    "activity_unit": { "type": "string", "enum": ["MBq", "GBq"] },
    "remedial_priority": { "type": "string", "enum": ["immediate", "urgent", "planned", "advisory"] }
  }
}$json$::jsonb
from public.disciplines where code = 'radiation' and org_id is null;

insert into public.discipline_schemas (discipline_id, target, version, json_schema)
select id, 'inspection', 1, $json${
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Radiation inspection payload",
  "type": "object",
  "required": ["assessment_type"],
  "additionalProperties": false,
  "properties": {
    "assessment_type": { "type": "string", "enum": ["radiation_safety_assessment", "leak_test", "dose_assessment", "source_inventory_check"] },
    "rpa_name": { "type": "string", "title": "Radiation Protection Adviser" },
    "overall_risk_rating": { "type": "string", "enum": ["low", "medium", "high"] }
  }
}$json$::jsonb
from public.disciplines where code = 'radiation' and org_id is null;
