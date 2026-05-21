-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.app_users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  pin text NOT NULL CHECK (length(pin) = 4 AND pin ~ '^[0-9]+$'::text),
  created_at timestamp with time zone DEFAULT now(),
  last_login timestamp with time zone,
  CONSTRAINT app_users_pkey PRIMARY KEY (id)
);
CREATE TABLE public.blocked_ips (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  form_id uuid NOT NULL,
  ip_address text NOT NULL,
  reason text NOT NULL,
  blocked_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT blocked_ips_pkey PRIMARY KEY (id),
  CONSTRAINT blocked_ips_form_id_fkey FOREIGN KEY (form_id) REFERENCES public.request_forms(id)
);
CREATE TABLE public.bots (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  short_description text NOT NULL,
  personality text NOT NULL,
  first_message text NOT NULL,
  scenario text NOT NULL DEFAULT ''::text,
  example_dialogues text NOT NULL DEFAULT ''::text,
  tags ARRAY NOT NULL DEFAULT '{}'::text[],
  rating text NOT NULL DEFAULT 'SFW'::text CHECK (rating = ANY (ARRAY['SFW'::text, 'NSFW'::text])),
  image_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  chat_name text,
  CONSTRAINT bots_pkey PRIMARY KEY (id),
  CONSTRAINT bots_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.custom_blocklists (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  form_id uuid NOT NULL,
  pattern text NOT NULL,
  is_regex boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  severity text DEFAULT 'warning'::text CHECK (severity = ANY (ARRAY['warning'::text, 'dangerous'::text])),
  CONSTRAINT custom_blocklists_pkey PRIMARY KEY (id),
  CONSTRAINT custom_blocklists_form_id_fkey FOREIGN KEY (form_id) REFERENCES public.request_forms(id)
);
CREATE TABLE public.flagged_requests (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  form_id uuid NOT NULL,
  request_id uuid NOT NULL,
  risk_level text NOT NULL CHECK (risk_level = ANY (ARRAY['warning'::text, 'dangerous'::text])),
  flagged_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text,
  reviewed boolean NOT NULL DEFAULT false,
  review_action text CHECK (review_action = ANY (ARRAY['approved'::text, 'rejected'::text])),
  review_notes text,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT flagged_requests_pkey PRIMARY KEY (id),
  CONSTRAINT flagged_requests_form_id_fkey FOREIGN KEY (form_id) REFERENCES public.request_forms(id),
  CONSTRAINT flagged_requests_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.requests(id)
);
CREATE TABLE public.global_blocklists (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  pattern text NOT NULL,
  is_regex boolean NOT NULL DEFAULT false,
  severity text DEFAULT 'warning'::text CHECK (severity = ANY (ARRAY['warning'::text, 'dangerous'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT global_blocklists_pkey PRIMARY KEY (id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  username text UNIQUE,
  display_name text,
  avatar_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.request_forms (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT ''::text,
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  shareable_link text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  security_sensitivity text DEFAULT 'medium'::text CHECK (security_sensitivity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'strict'::text])),
  CONSTRAINT request_forms_pkey PRIMARY KEY (id),
  CONSTRAINT request_forms_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.requests (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  form_id uuid NOT NULL,
  user_id uuid NOT NULL,
  form_title text NOT NULL,
  status text NOT NULL DEFAULT 'new'::text CHECK (status = ANY (ARRAY['new'::text, 'accepted'::text, 'completed'::text, 'rejected'::text])),
  submitter_name text,
  responses jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT requests_pkey PRIMARY KEY (id),
  CONSTRAINT requests_form_id_fkey FOREIGN KEY (form_id) REFERENCES public.request_forms(id),
  CONSTRAINT requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);