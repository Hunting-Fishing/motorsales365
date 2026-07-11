
-- Medical Condition Catalog (global reference data)
CREATE TABLE public.pt_medical_condition_catalog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  default_restrictions TEXT[] DEFAULT '{}',
  default_dietary_implications TEXT[] DEFAULT '{}',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Client Medical Conditions (per-client data)
CREATE TABLE public.pt_client_medical_conditions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  shop_id UUID NOT NULL,
  condition_code TEXT NOT NULL,
  condition_name TEXT NOT NULL,
  category TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'moderate',
  status TEXT NOT NULL DEFAULT 'active',
  diagnosed_date DATE,
  notes TEXT,
  exercise_restrictions TEXT[] DEFAULT '{}',
  dietary_implications TEXT[] DEFAULT '{}',
  cleared_by_physician BOOLEAN DEFAULT false,
  clearance_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.pt_medical_condition_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pt_client_medical_conditions ENABLE ROW LEVEL SECURITY;

-- Catalog: readable by all authenticated users (global reference)
CREATE POLICY "Authenticated users can read medical catalog"
  ON public.pt_medical_condition_catalog FOR SELECT TO authenticated USING (true);

-- Client conditions: shop-scoped
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Shop users can manage client medical conditions' AND tablename = 'pt_client_medical_conditions') THEN
    CREATE POLICY "Shop users can manage client medical conditions"
      ON public.pt_client_medical_conditions FOR ALL TO authenticated
      USING (shop_id = public.get_current_user_shop_id())
      WITH CHECK (shop_id = public.get_current_user_shop_id());
  END IF;
END $$;

-- Indexes
CREATE INDEX idx_pt_client_medical_client ON public.pt_client_medical_conditions(client_id);
CREATE INDEX idx_pt_client_medical_shop ON public.pt_client_medical_conditions(shop_id);
CREATE INDEX idx_pt_medical_catalog_category ON public.pt_medical_condition_catalog(category);

-- Seed ~120 conditions across 11 categories
INSERT INTO public.pt_medical_condition_catalog (code, name, category, default_restrictions, default_dietary_implications, description) VALUES
-- Musculoskeletal (15)
('acl_tear', 'ACL Tear', 'Musculoskeletal', '{"no_impact","no_lateral_pivoting","no_heavy_squat","no_jumping"}', '{"anti_inflammatory"}', 'Anterior cruciate ligament tear or reconstruction'),
('meniscus_injury', 'Meniscus Injury', 'Musculoskeletal', '{"no_deep_squat","no_impact","limited_knee_flexion"}', '{"anti_inflammatory"}', 'Torn or damaged meniscus cartilage'),
('rotator_cuff', 'Rotator Cuff Injury', 'Musculoskeletal', '{"no_overhead_press","no_heavy_pull","limited_shoulder_rotation"}', '{"anti_inflammatory"}', 'Rotator cuff tear or impingement'),
('herniated_disc', 'Herniated Disc', 'Musculoskeletal', '{"no_heavy_deadlift","no_axial_loading","no_spinal_flexion","no_impact"}', '{"anti_inflammatory"}', 'Spinal disc herniation'),
('scoliosis', 'Scoliosis', 'Musculoskeletal', '{"careful_spinal_loading","asymmetric_training_focus"}', '{}', 'Abnormal lateral curvature of the spine'),
('arthritis_general', 'Arthritis (General)', 'Musculoskeletal', '{"low_impact_only","avoid_repetitive_strain","warm_up_extended"}', '{"anti_inflammatory","omega_3_rich"}', 'Joint inflammation and stiffness'),
('tendinitis', 'Tendinitis', 'Musculoskeletal', '{"reduce_volume_affected_area","avoid_eccentric_overload"}', '{"anti_inflammatory"}', 'Tendon inflammation'),
('carpal_tunnel', 'Carpal Tunnel Syndrome', 'Musculoskeletal', '{"limited_grip_work","wrist_neutral_only","avoid_vibration"}', '{"anti_inflammatory"}', 'Median nerve compression in the wrist'),
('plantar_fasciitis', 'Plantar Fasciitis', 'Musculoskeletal', '{"limited_running","no_barefoot_training","cushioned_footwear"}', '{"anti_inflammatory"}', 'Inflammation of the plantar fascia'),
('hip_replacement', 'Hip Replacement', 'Musculoskeletal', '{"no_deep_hip_flexion","no_impact","no_adduction_past_midline","no_internal_rotation"}', '{"calcium_rich","vitamin_d"}', 'Total or partial hip arthroplasty'),
('knee_replacement', 'Knee Replacement', 'Musculoskeletal', '{"no_impact","no_deep_squat","limited_knee_flexion","no_kneeling"}', '{"calcium_rich","vitamin_d"}', 'Total or partial knee arthroplasty'),
('frozen_shoulder', 'Frozen Shoulder', 'Musculoskeletal', '{"limited_shoulder_range","no_overhead_press","gentle_mobility_only"}', '{"anti_inflammatory"}', 'Adhesive capsulitis limiting shoulder mobility'),
('shin_splints', 'Shin Splints', 'Musculoskeletal', '{"no_running","no_impact","low_impact_cardio_only"}', '{"calcium_rich"}', 'Medial tibial stress syndrome'),
('labral_tear_hip', 'Hip Labral Tear', 'Musculoskeletal', '{"no_deep_squat","limited_hip_rotation","no_impact"}', '{"anti_inflammatory"}', 'Tear in the hip labrum'),
('labral_tear_shoulder', 'Shoulder Labral Tear', 'Musculoskeletal', '{"no_overhead_press","no_heavy_pull","limited_shoulder_rotation"}', '{"anti_inflammatory"}', 'Tear in the shoulder labrum'),

-- Amputations (8)
('amp_above_knee', 'Above-Knee Amputation', 'Amputations', '{"seated_alternatives","upper_body_focus","balance_adaptations","prosthetic_aware"}', '{}', 'Transfemoral amputation'),
('amp_below_knee', 'Below-Knee Amputation', 'Amputations', '{"balance_adaptations","prosthetic_aware","impact_modifications"}', '{}', 'Transtibial amputation'),
('amp_above_elbow', 'Above-Elbow Amputation', 'Amputations', '{"unilateral_upper_adaptations","grip_alternatives","machine_preference"}', '{}', 'Transhumeral amputation'),
('amp_below_elbow', 'Below-Elbow Amputation', 'Amputations', '{"grip_alternatives","strap_attachments","unilateral_adaptations"}', '{}', 'Transradial amputation'),
('amp_partial_hand', 'Partial Hand Amputation', 'Amputations', '{"grip_alternatives","strap_attachments"}', '{}', 'Partial hand or finger amputation'),
('amp_partial_foot', 'Partial Foot Amputation', 'Amputations', '{"balance_adaptations","footwear_modifications","impact_modifications"}', '{}', 'Partial foot amputation'),
('amp_bilateral_lower', 'Bilateral Lower Limb Amputation', 'Amputations', '{"wheelchair_exercises","seated_training","upper_body_focus"}', '{}', 'Both lower limbs amputated'),
('amp_bilateral_upper', 'Bilateral Upper Limb Amputation', 'Amputations', '{"lower_body_focus","adaptive_equipment","machine_preference"}', '{}', 'Both upper limbs amputated'),

-- Cardiovascular (10)
('heart_disease', 'Heart Disease', 'Cardiovascular', '{"heart_rate_monitored","no_valsalva","moderate_intensity_only","avoid_isometric_holds"}', '{"low_sodium","heart_healthy","omega_3_rich","low_saturated_fat"}', 'Coronary artery disease or heart failure'),
('hypertension', 'Hypertension', 'Cardiovascular', '{"no_valsalva","avoid_isometric_holds","moderate_intensity","heart_rate_monitored"}', '{"low_sodium","dash_diet","potassium_rich"}', 'High blood pressure'),
('arrhythmia', 'Arrhythmia', 'Cardiovascular', '{"heart_rate_monitored","no_stimulant_pre_workout","moderate_intensity_only"}', '{"low_caffeine","magnesium_rich"}', 'Irregular heartbeat'),
('post_bypass', 'Post-Cardiac Bypass', 'Cardiovascular', '{"cardiac_rehab_protocol","progressive_return","heart_rate_monitored","no_upper_body_8_weeks"}', '{"heart_healthy","low_sodium","low_saturated_fat"}', 'Post coronary artery bypass surgery'),
('pacemaker', 'Pacemaker', 'Cardiovascular', '{"heart_rate_monitored","no_chest_impact","avoid_strong_magnets","moderate_intensity"}', '{"heart_healthy"}', 'Implanted cardiac pacemaker'),
('dvt_history', 'DVT History', 'Cardiovascular', '{"compression_garments","avoid_prolonged_sitting","calf_exercises_encouraged"}', '{"blood_thinning_foods","hydration_focus"}', 'History of deep vein thrombosis'),
('peripheral_artery', 'Peripheral Artery Disease', 'Cardiovascular', '{"walking_program","progressive_cardio","rest_when_claudication"}', '{"heart_healthy","low_cholesterol"}', 'Narrowed arteries reducing blood flow to limbs'),
('heart_valve', 'Heart Valve Disorder', 'Cardiovascular', '{"moderate_intensity","heart_rate_monitored","no_valsalva"}', '{"heart_healthy","low_sodium"}', 'Valve stenosis or regurgitation'),
('postural_hypotension', 'Postural Hypotension', 'Cardiovascular', '{"slow_position_changes","avoid_sudden_standing","hydration_critical"}', '{"hydration_focus","adequate_sodium"}', 'Blood pressure drop when standing'),
('varicose_veins', 'Varicose Veins', 'Cardiovascular', '{"compression_garments","elevate_legs_post_exercise","avoid_prolonged_standing"}', '{"anti_inflammatory"}', 'Enlarged, twisted veins'),

-- Respiratory (8)
('asthma', 'Asthma', 'Respiratory', '{"inhaler_available","warm_up_extended","cold_air_caution","monitor_breathing"}', '{"anti_inflammatory"}', 'Chronic airway inflammation'),
('copd', 'COPD', 'Respiratory', '{"low_to_moderate_intensity","breathing_exercises","rest_periods_extended","oxygen_if_needed"}', '{"anti_inflammatory","antioxidant_rich"}', 'Chronic obstructive pulmonary disease'),
('exercise_induced_bronchoconstriction', 'Exercise-Induced Bronchospasm', 'Respiratory', '{"warm_up_gradual","inhaler_pre_exercise","avoid_cold_dry_air","interval_preferred"}', '{}', 'Airway narrowing during exercise'),
('post_covid_lung', 'Post-COVID Lung Issues', 'Respiratory', '{"progressive_return","monitor_spo2","extended_rest","breathing_exercises"}', '{"anti_inflammatory","vitamin_d","zinc_rich"}', 'Persistent respiratory issues after COVID-19'),
('sleep_apnea', 'Sleep Apnea', 'Respiratory', '{"morning_training_preferred","avoid_supine_exercises_if_severe"}', '{"weight_management","anti_inflammatory"}', 'Breathing interruptions during sleep'),
('pulmonary_fibrosis', 'Pulmonary Fibrosis', 'Respiratory', '{"low_intensity","oxygen_monitoring","breathing_exercises"}', '{"anti_inflammatory","antioxidant_rich"}', 'Scarring of lung tissue'),
('pneumonia_recovery', 'Pneumonia Recovery', 'Respiratory', '{"progressive_return","monitor_breathing","low_intensity_start"}', '{"immune_boosting","hydration_focus"}', 'Recovery from pneumonia'),
('bronchitis_chronic', 'Chronic Bronchitis', 'Respiratory', '{"breathing_exercises","avoid_polluted_air","moderate_intensity"}', '{"anti_inflammatory","hydration_focus"}', 'Long-term bronchial inflammation'),

-- Neurological (10)
('multiple_sclerosis', 'Multiple Sclerosis', 'Neurological', '{"heat_sensitive","fatigue_management","balance_support","cool_environment"}', '{"anti_inflammatory","vitamin_d"}', 'Autoimmune disease affecting the central nervous system'),
('parkinsons', 'Parkinson''s Disease', 'Neurological', '{"balance_support","fall_prevention","rhythmic_exercises","large_amplitude_movements"}', '{"antioxidant_rich","omega_3_rich"}', 'Progressive nervous system disorder'),
('stroke_recovery', 'Stroke Recovery', 'Neurological', '{"affected_side_rehab","balance_support","progressive_return","blood_pressure_monitored"}', '{"heart_healthy","low_sodium","omega_3_rich"}', 'Post-stroke rehabilitation'),
('epilepsy', 'Epilepsy', 'Neurological', '{"avoid_flashing_lights","no_swimming_alone","spotter_required","hydration_critical"}', '{"ketogenic_option","magnesium_rich"}', 'Seizure disorder'),
('neuropathy', 'Peripheral Neuropathy', 'Neurological', '{"foot_protection","balance_support","avoid_vibration","sensation_checks"}', '{"b12_rich","anti_inflammatory"}', 'Nerve damage causing weakness or numbness'),
('vertigo', 'Vertigo / BPPV', 'Neurological', '{"no_inversions","slow_head_movements","seated_alternatives","balance_support"}', '{"low_sodium","hydration_focus"}', 'Episodes of dizziness and balance issues'),
('concussion_recovery', 'Concussion Recovery', 'Neurological', '{"progressive_return","no_contact","heart_rate_below_threshold","cognitive_load_monitoring"}', '{"omega_3_rich","antioxidant_rich"}', 'Post-concussion rehabilitation'),
('sciatica', 'Sciatica', 'Neurological', '{"no_heavy_deadlift","avoid_prolonged_sitting","gentle_stretching","core_stability_focus"}', '{"anti_inflammatory"}', 'Pain along the sciatic nerve'),
('bells_palsy', 'Bell''s Palsy', 'Neurological', '{"normal_exercise_ok","facial_exercises_added"}', '{"anti_inflammatory","b_vitamins"}', 'Temporary facial paralysis'),
('restless_legs', 'Restless Legs Syndrome', 'Neurological', '{"evening_exercise_helpful","stretching_focus","moderate_cardio"}', '{"iron_rich","magnesium_rich"}', 'Uncontrollable urge to move legs'),

-- Metabolic (10)
('diabetes_type1', 'Type 1 Diabetes', 'Metabolic', '{"blood_sugar_monitoring","carb_timing_critical","insulin_adjustment","hypo_snack_available"}', '{"diabetic_friendly","consistent_carbs","low_gi"}', 'Autoimmune insulin-dependent diabetes'),
('diabetes_type2', 'Type 2 Diabetes', 'Metabolic', '{"blood_sugar_monitoring","post_meal_exercise_beneficial","progressive_intensity"}', '{"diabetic_friendly","low_gi","high_fiber","weight_management"}', 'Insulin-resistant diabetes'),
('thyroid_hypo', 'Hypothyroidism', 'Metabolic', '{"fatigue_management","progressive_overload","recovery_focus"}', '{"iodine_aware","selenium_rich","avoid_goitrogens"}', 'Underactive thyroid'),
('thyroid_hyper', 'Hyperthyroidism', 'Metabolic', '{"heart_rate_monitored","avoid_overheating","moderate_intensity"}', '{"calcium_rich","vitamin_d","calorie_adequate"}', 'Overactive thyroid'),
('pcos', 'PCOS', 'Metabolic', '{"strength_training_beneficial","hiit_beneficial","stress_management"}', '{"anti_inflammatory","low_gi","insulin_sensitive"}', 'Polycystic ovary syndrome'),
('metabolic_syndrome', 'Metabolic Syndrome', 'Metabolic', '{"progressive_cardio","strength_training","weight_management_focus"}', '{"low_gi","heart_healthy","high_fiber","weight_management"}', 'Cluster of metabolic risk factors'),
('cushings', 'Cushing''s Syndrome', 'Metabolic', '{"bone_protection","gentle_strength","fall_prevention"}', '{"low_sodium","calcium_rich","protein_adequate"}', 'Excess cortisol production'),
('addisons', 'Addison''s Disease', 'Metabolic', '{"hydration_critical","electrolyte_management","stress_dose_awareness"}', '{"adequate_sodium","hydration_focus"}', 'Adrenal insufficiency'),
('gout', 'Gout', 'Metabolic', '{"avoid_during_flare","low_impact_during_recovery","hydration_critical"}', '{"low_purine","hydration_focus","anti_inflammatory"}', 'Uric acid crystal joint inflammation'),
('iron_deficiency', 'Iron Deficiency / Anemia', 'Metabolic', '{"fatigue_management","progressive_intensity","recovery_focus"}', '{"iron_rich","vitamin_c_with_meals","avoid_tea_with_meals"}', 'Low iron levels or anemia'),

-- Pregnancy & Postpartum (8)
('pregnancy_t1', 'Pregnancy - Trimester 1', 'Pregnancy & Postpartum', '{"no_contact_sport","avoid_overheating","moderate_intensity","no_supine_after_16w","pelvic_floor_focus"}', '{"folate_rich","iron_rich","avoid_raw_fish","limit_caffeine","adequate_calories"}', 'First trimester of pregnancy'),
('pregnancy_t2', 'Pregnancy - Trimester 2', 'Pregnancy & Postpartum', '{"no_supine_exercises","no_contact","moderate_intensity","balance_caution","pelvic_floor_focus"}', '{"iron_rich","calcium_rich","adequate_calories","hydration_focus"}', 'Second trimester of pregnancy'),
('pregnancy_t3', 'Pregnancy - Trimester 3', 'Pregnancy & Postpartum', '{"no_supine","low_impact_only","balance_support","reduced_intensity","pelvic_floor_focus"}', '{"iron_rich","calcium_rich","adequate_calories","small_frequent_meals"}', 'Third trimester of pregnancy'),
('postpartum_early', 'Postpartum Recovery (0-6 weeks)', 'Pregnancy & Postpartum', '{"physician_clearance_required","walking_only","pelvic_floor_rehab","no_heavy_lifting"}', '{"calorie_adequate","hydration_focus","iron_rich","calcium_rich"}', 'Early postpartum recovery period'),
('postpartum_late', 'Postpartum Recovery (6+ weeks)', 'Pregnancy & Postpartum', '{"progressive_return","core_rehab_first","pelvic_floor_check","diastasis_screening"}', '{"calorie_adequate","hydration_focus"}', 'Later postpartum return to exercise'),
('diastasis_recti', 'Diastasis Recti', 'Pregnancy & Postpartum', '{"no_crunches","no_planks_initially","deep_core_activation","breath_work"}', '{}', 'Separation of abdominal muscles'),
('pelvic_floor_dysfunction', 'Pelvic Floor Dysfunction', 'Pregnancy & Postpartum', '{"no_heavy_valsalva","pelvic_floor_rehab","impact_modification","breath_work"}', '{"hydration_focus","fiber_rich"}', 'Weakened or overactive pelvic floor'),
('gestational_diabetes', 'Gestational Diabetes', 'Pregnancy & Postpartum', '{"blood_sugar_monitoring","post_meal_walking","moderate_intensity"}', '{"diabetic_friendly","low_gi","consistent_carbs","small_frequent_meals"}', 'Diabetes developed during pregnancy'),

-- Mental Health (6)
('exercise_anxiety', 'Exercise-Related Anxiety', 'Mental Health', '{"gradual_exposure","familiar_environment","avoid_crowded_times","breathing_techniques"}', '{}', 'Anxiety triggered by exercise or gym environments'),
('ptsd', 'PTSD', 'Mental Health', '{"trauma_informed_approach","predictable_routines","safe_environment","avoid_sudden_stimuli"}', '{"anti_inflammatory","omega_3_rich"}', 'Post-traumatic stress disorder'),
('eating_disorder_history', 'Eating Disorder History', 'Mental Health', '{"no_calorie_counting_visible","no_body_composition_focus","exercise_enjoyment_focus","monitor_compulsive_exercise"}', '{"no_restrictive_diets","balanced_approach","intuitive_eating"}', 'History of anorexia, bulimia, or binge eating'),
('depression', 'Depression', 'Mental Health', '{"routine_building","social_exercise_encouraged","outdoor_preferred","achievement_tracking"}', '{"omega_3_rich","vitamin_d","tryptophan_rich"}', 'Major depressive disorder'),
('adhd', 'ADHD', 'Mental Health', '{"varied_exercises","short_circuits","music_allowed","timer_based_workouts"}', '{"protein_rich_breakfast","omega_3_rich","low_sugar"}', 'Attention deficit hyperactivity disorder'),
('body_dysmorphia', 'Body Dysmorphia', 'Mental Health', '{"no_mirror_focus","performance_goals_only","no_body_measurements","positive_reinforcement"}', '{"balanced_approach","no_restrictive_diets"}', 'Obsessive focus on perceived body flaws'),

-- Post-Surgical (8)
('post_cardiac_surgery', 'Post-Cardiac Surgery', 'Post-Surgical', '{"cardiac_rehab_protocol","progressive_return","sternal_precautions","heart_rate_monitored"}', '{"heart_healthy","low_sodium","anti_inflammatory"}', 'Recovery from heart surgery'),
('joint_replacement_rehab', 'Joint Replacement Rehab', 'Post-Surgical', '{"physio_protocol","no_impact","progressive_rom","weight_bearing_per_protocol"}', '{"calcium_rich","vitamin_d","protein_adequate"}', 'Rehabilitation after joint replacement'),
('spinal_fusion', 'Spinal Fusion', 'Post-Surgical', '{"no_spinal_rotation","no_flexion_extension","core_bracing","limited_bending"}', '{"calcium_rich","vitamin_d","anti_inflammatory"}', 'Post spinal fusion surgery'),
('bariatric_surgery', 'Bariatric Surgery Recovery', 'Post-Surgical', '{"progressive_return","protein_priority","hydration_critical","no_heavy_lifting_initial"}', '{"high_protein","small_frequent_meals","vitamin_supplementation","hydration_focus"}', 'Post weight-loss surgery recovery'),
('appendectomy', 'Post-Appendectomy', 'Post-Surgical', '{"no_core_strain_2_weeks","progressive_return","listen_to_body"}', '{"light_diet_initial","hydration_focus"}', 'Recovery from appendix removal'),
('hernia_repair', 'Post-Hernia Repair', 'Post-Surgical', '{"no_heavy_lifting_6_weeks","no_straining","progressive_core_work"}', '{"fiber_rich","hydration_focus"}', 'Recovery from hernia surgery'),
('mastectomy', 'Post-Mastectomy', 'Post-Surgical', '{"limited_upper_body_range","lymphedema_precautions","progressive_shoulder_mobility"}', '{"anti_inflammatory","immune_boosting"}', 'Recovery from breast surgery'),
('acl_reconstruction', 'ACL Reconstruction Rehab', 'Post-Surgical', '{"physio_protocol","no_pivoting","progressive_weight_bearing","quad_focus"}', '{"anti_inflammatory","protein_adequate","calcium_rich"}', 'Post ACL reconstruction rehabilitation'),

-- Chronic Pain (8)
('fibromyalgia', 'Fibromyalgia', 'Chronic Pain', '{"gentle_start","fatigue_management","low_to_moderate_intensity","avoid_flare_triggers"}', '{"anti_inflammatory","magnesium_rich","vitamin_d"}', 'Widespread musculoskeletal pain'),
('chronic_fatigue', 'Chronic Fatigue Syndrome', 'Chronic Pain', '{"energy_envelope_pacing","no_overexertion","short_sessions","rest_between_sets"}', '{"anti_inflammatory","b_vitamins","iron_rich"}', 'Persistent unexplained fatigue'),
('chronic_back_pain', 'Chronic Back Pain', 'Chronic Pain', '{"core_stability_focus","avoid_loaded_flexion","mcgill_big_3","movement_variety"}', '{"anti_inflammatory","omega_3_rich"}', 'Persistent lower or upper back pain'),
('migraines', 'Migraines', 'Chronic Pain', '{"avoid_extreme_exertion","hydration_critical","consistent_schedule","no_valsalva"}', '{"magnesium_rich","hydration_focus","avoid_triggers"}', 'Recurring severe headaches'),
('tmj', 'TMJ Disorder', 'Chronic Pain', '{"jaw_relaxation","avoid_clenching_during_effort","stress_management"}', '{"soft_foods_during_flare","anti_inflammatory"}', 'Temporomandibular joint dysfunction'),
('chronic_neck_pain', 'Chronic Neck Pain', 'Chronic Pain', '{"posture_focus","no_heavy_overhead","neck_mobility","upper_trap_release"}', '{"anti_inflammatory"}', 'Persistent neck pain'),
('complex_regional_pain', 'Complex Regional Pain Syndrome', 'Chronic Pain', '{"graded_motor_imagery","gentle_movement","desensitization","mirror_therapy"}', '{"anti_inflammatory","omega_3_rich"}', 'Chronic pain usually affecting a limb'),
('endometriosis', 'Endometriosis', 'Chronic Pain', '{"modify_during_flare","gentle_core_work","stress_management","listen_to_body"}', '{"anti_inflammatory","omega_3_rich","iron_rich"}', 'Tissue similar to uterine lining growing outside the uterus'),

-- Other (10)
('osteoporosis', 'Osteoporosis', 'Other', '{"no_spinal_flexion","weight_bearing_encouraged","balance_training","fall_prevention"}', '{"calcium_rich","vitamin_d","protein_adequate"}', 'Weakened bones prone to fracture'),
('osteopenia', 'Osteopenia', 'Other', '{"weight_bearing_encouraged","impact_training_beneficial","balance_training"}', '{"calcium_rich","vitamin_d"}', 'Lower than normal bone density'),
('cancer_recovery', 'Cancer Recovery', 'Other', '{"physician_clearance","fatigue_management","immune_precautions","progressive_return"}', '{"immune_boosting","anti_inflammatory","protein_adequate","antioxidant_rich"}', 'Recovery during or after cancer treatment'),
('autoimmune_general', 'Autoimmune Condition', 'Other', '{"flare_management","fatigue_awareness","moderate_intensity","stress_management"}', '{"anti_inflammatory","gut_health"}', 'General autoimmune disorder'),
('vision_impairment', 'Vision Impairment', 'Other', '{"equipment_orientation","verbal_cues","consistent_layout","spotter_for_free_weights"}', '{"vitamin_a_rich","omega_3_rich"}', 'Significant vision loss or blindness'),
('hearing_impairment', 'Hearing Impairment', 'Other', '{"visual_cues","written_instructions","face_to_face_communication","vibration_timers"}', '{}', 'Significant hearing loss or deafness'),
('ehlers_danlos', 'Ehlers-Danlos Syndrome', 'Other', '{"joint_stability_focus","avoid_hyperextension","controlled_rom","no_ballistic_movements"}', '{"collagen_support","vitamin_c"}', 'Connective tissue disorder'),
('lupus', 'Lupus (SLE)', 'Other', '{"sun_protection","fatigue_management","flare_awareness","joint_protection"}', '{"anti_inflammatory","vitamin_d","omega_3_rich"}', 'Systemic autoimmune disease'),
('celiac_disease', 'Celiac Disease', 'Other', '{"normal_exercise_ok","energy_management"}', '{"strict_gluten_free","iron_rich","calcium_rich","b12_rich"}', 'Autoimmune reaction to gluten'),
('ibs', 'Irritable Bowel Syndrome', 'Other', '{"bathroom_access","avoid_jarring_movements_during_flare","stress_management"}', '{"fodmap_friendly","fiber_balanced","hydration_focus","probiotics"}', 'Chronic digestive condition');
