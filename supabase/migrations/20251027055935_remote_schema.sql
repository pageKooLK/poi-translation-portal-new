create table "public"."duplicate_checks" (
    "id" uuid not null default gen_random_uuid(),
    "new_poi_data" jsonb not null,
    "duplicate_candidates" jsonb,
    "resolution" character varying,
    "reviewer_name" character varying,
    "created_at" timestamp with time zone default now()
);


alter table "public"."duplicate_checks" enable row level security;

create table "public"."edit_history" (
    "id" uuid not null default gen_random_uuid(),
    "poi_id" uuid,
    "language_code" character varying(5),
    "action" character varying not null,
    "old_value" character varying,
    "new_value" character varying,
    "reviewer_name" character varying not null,
    "reviewer_email" character varying not null,
    "reasoning" text,
    "created_at" timestamp with time zone default now()
);


alter table "public"."edit_history" enable row level security;

create table "public"."manual_check_queue" (
    "id" uuid not null default gen_random_uuid(),
    "poi_id" uuid,
    "language_code" character varying(5),
    "check_type" character varying not null,
    "priority" integer default 0,
    "current_reviewer" character varying,
    "reviewer_start_time" timestamp with time zone,
    "metadata" jsonb,
    "created_at" timestamp with time zone default now()
);


alter table "public"."manual_check_queue" enable row level security;

create table "public"."pois" (
    "id" uuid not null default gen_random_uuid(),
    "klook_poi_id" character varying not null,
    "klook_poi_name" character varying not null,
    "google_place_id" character varying not null,
    "country" character varying not null,
    "google_maps_data" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."pois" enable row level security;

create table "public"."translation_sources" (
    "id" uuid not null default gen_random_uuid(),
    "translation_id" uuid,
    "source_type" character varying not null,
    "recommended_name" character varying,
    "reasoning" text,
    "confidence_score" numeric(5,2),
    "raw_data" jsonb,
    "html_snapshot_url" text,
    "created_at" timestamp with time zone default now()
);


alter table "public"."translation_sources" enable row level security;

create table "public"."translations" (
    "id" uuid not null default gen_random_uuid(),
    "poi_id" uuid,
    "language_code" character varying(5) not null,
    "final_translation" character varying not null,
    "status" character varying default 'completed'::character varying,
    "similarity_score" numeric(5,2),
    "needs_manual_check" boolean default false,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."translations" enable row level security;

CREATE UNIQUE INDEX duplicate_checks_pkey ON public.duplicate_checks USING btree (id);

CREATE UNIQUE INDEX edit_history_pkey ON public.edit_history USING btree (id);

CREATE INDEX idx_edit_history_poi ON public.edit_history USING btree (poi_id);

CREATE INDEX idx_manual_check_queue_reviewer ON public.manual_check_queue USING btree (current_reviewer);

CREATE INDEX idx_manual_check_queue_type ON public.manual_check_queue USING btree (check_type);

CREATE INDEX idx_pois_google_place_id ON public.pois USING btree (google_place_id);

CREATE INDEX idx_pois_klook_id ON public.pois USING btree (klook_poi_id);

CREATE INDEX idx_translations_poi_language ON public.translations USING btree (poi_id, language_code);

CREATE INDEX idx_translations_status ON public.translations USING btree (status);

CREATE UNIQUE INDEX manual_check_queue_pkey ON public.manual_check_queue USING btree (id);

CREATE UNIQUE INDEX pois_google_place_id_key ON public.pois USING btree (google_place_id);

CREATE UNIQUE INDEX pois_klook_poi_id_key ON public.pois USING btree (klook_poi_id);

CREATE UNIQUE INDEX pois_pkey ON public.pois USING btree (id);

CREATE UNIQUE INDEX translation_sources_pkey ON public.translation_sources USING btree (id);

CREATE UNIQUE INDEX translations_pkey ON public.translations USING btree (id);

CREATE UNIQUE INDEX translations_poi_id_language_code_key ON public.translations USING btree (poi_id, language_code);

alter table "public"."duplicate_checks" add constraint "duplicate_checks_pkey" PRIMARY KEY using index "duplicate_checks_pkey";

alter table "public"."edit_history" add constraint "edit_history_pkey" PRIMARY KEY using index "edit_history_pkey";

alter table "public"."manual_check_queue" add constraint "manual_check_queue_pkey" PRIMARY KEY using index "manual_check_queue_pkey";

alter table "public"."pois" add constraint "pois_pkey" PRIMARY KEY using index "pois_pkey";

alter table "public"."translation_sources" add constraint "translation_sources_pkey" PRIMARY KEY using index "translation_sources_pkey";

alter table "public"."translations" add constraint "translations_pkey" PRIMARY KEY using index "translations_pkey";

alter table "public"."edit_history" add constraint "edit_history_poi_id_fkey" FOREIGN KEY (poi_id) REFERENCES pois(id) not valid;

alter table "public"."edit_history" validate constraint "edit_history_poi_id_fkey";

alter table "public"."manual_check_queue" add constraint "manual_check_queue_poi_id_fkey" FOREIGN KEY (poi_id) REFERENCES pois(id) not valid;

alter table "public"."manual_check_queue" validate constraint "manual_check_queue_poi_id_fkey";

alter table "public"."pois" add constraint "pois_google_place_id_key" UNIQUE using index "pois_google_place_id_key";

alter table "public"."pois" add constraint "pois_klook_poi_id_key" UNIQUE using index "pois_klook_poi_id_key";

alter table "public"."translation_sources" add constraint "translation_sources_translation_id_fkey" FOREIGN KEY (translation_id) REFERENCES translations(id) ON DELETE CASCADE not valid;

alter table "public"."translation_sources" validate constraint "translation_sources_translation_id_fkey";

alter table "public"."translations" add constraint "translations_poi_id_fkey" FOREIGN KEY (poi_id) REFERENCES pois(id) ON DELETE CASCADE not valid;

alter table "public"."translations" validate constraint "translations_poi_id_fkey";

alter table "public"."translations" add constraint "translations_poi_id_language_code_key" UNIQUE using index "translations_poi_id_language_code_key";

create policy "Allow all operations"
on "public"."duplicate_checks"
as permissive
for all
to public
using (true);


create policy "Allow all operations"
on "public"."edit_history"
as permissive
for all
to public
using (true);


create policy "Allow all operations"
on "public"."manual_check_queue"
as permissive
for all
to public
using (true);


create policy "Allow all operations"
on "public"."pois"
as permissive
for all
to public
using (true);


create policy "Allow all operations"
on "public"."translation_sources"
as permissive
for all
to public
using (true);


create policy "Allow all operations"
on "public"."translations"
as permissive
for all
to public
using (true);



