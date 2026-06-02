
-- Add document type and birthdate to persona
DO $$ BEGIN
  CREATE TYPE public.tipo_documento AS ENUM ('cedula','tarjeta_identidad','pasaporte','cedula_extranjeria');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.persona
  ADD COLUMN IF NOT EXISTS tipo_documento public.tipo_documento,
  ADD COLUMN IF NOT EXISTS fecha_nacimiento date;

-- Update handle_new_user to consume extra fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.persona (id, email, nombre, apellido, tipo_documento, documento, telefono, fecha_nacimiento)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre', NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'apellido', ''),
    NULLIF(NEW.raw_user_meta_data->>'tipo_documento','')::public.tipo_documento,
    NULLIF(NEW.raw_user_meta_data->>'documento',''),
    NULLIF(NEW.raw_user_meta_data->>'telefono',''),
    NULLIF(NEW.raw_user_meta_data->>'fecha_nacimiento','')::date
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.rol (persona_id, rol)
  VALUES (NEW.id, 'pasajero')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$function$;
