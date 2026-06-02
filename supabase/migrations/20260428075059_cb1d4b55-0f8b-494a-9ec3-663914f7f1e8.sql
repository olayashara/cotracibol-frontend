
-- Enum de tipos de rol y de vehículo
CREATE TYPE public.app_role AS ENUM ('pasajero', 'conductor', 'administrador');
CREATE TYPE public.tipo_vehiculo AS ENUM ('taxi', 'buseta');

-- Tabla persona (perfil)
CREATE TABLE public.persona (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL DEFAULT '',
  apellido TEXT NOT NULL DEFAULT '',
  documento TEXT,
  telefono TEXT,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.persona ENABLE ROW LEVEL SECURITY;

-- Tabla rol (roles asignados, separada por seguridad)
CREATE TABLE public.rol (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id UUID NOT NULL REFERENCES public.persona(id) ON DELETE CASCADE,
  rol public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (persona_id, rol)
);
ALTER TABLE public.rol ENABLE ROW LEVEL SECURITY;

-- Función security definer para evitar recursión en RLS
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.rol
    WHERE persona_id = _user_id AND rol = _role
  )
$$;

-- Tabla vehiculo
CREATE TABLE public.vehiculo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placa TEXT NOT NULL UNIQUE,
  tipo public.tipo_vehiculo NOT NULL,
  capacidad INT NOT NULL,
  conductor_id UUID REFERENCES public.persona(id) ON DELETE SET NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vehiculo ENABLE ROW LEVEL SECURITY;

-- Tabla viaje
CREATE TABLE public.viaje (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  tipo public.tipo_vehiculo NOT NULL,
  vehiculo_id UUID REFERENCES public.vehiculo(id) ON DELETE SET NULL,
  origen TEXT NOT NULL DEFAULT 'Ciudad Bolívar',
  destino TEXT NOT NULL DEFAULT 'Medellín',
  capacidad_total INT NOT NULL,
  cupos_disponibles INT NOT NULL,
  precio NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (fecha, hora, tipo, vehiculo_id)
);
ALTER TABLE public.viaje ENABLE ROW LEVEL SECURITY;

-- Tabla tiquete
CREATE TABLE public.tiquete (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viaje_id UUID NOT NULL REFERENCES public.viaje(id) ON DELETE CASCADE,
  persona_id UUID NOT NULL REFERENCES public.persona(id) ON DELETE CASCADE,
  numero_asiento INT NOT NULL,
  precio NUMERIC(10,2) NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pagado',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (viaje_id, numero_asiento)
);
ALTER TABLE public.tiquete ENABLE ROW LEVEL SECURITY;

-- Tabla notificacion
CREATE TABLE public.notificacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id UUID NOT NULL REFERENCES public.persona(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  leida BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notificacion ENABLE ROW LEVEL SECURITY;

-- ===== RLS persona =====
CREATE POLICY "persona_self_select" ON public.persona FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'administrador'));
CREATE POLICY "persona_self_update" ON public.persona FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'administrador'));
CREATE POLICY "persona_self_insert" ON public.persona FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- ===== RLS rol =====
CREATE POLICY "rol_self_select" ON public.rol FOR SELECT TO authenticated
  USING (persona_id = auth.uid() OR public.has_role(auth.uid(), 'administrador'));
CREATE POLICY "rol_admin_all" ON public.rol FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'))
  WITH CHECK (public.has_role(auth.uid(), 'administrador'));

-- ===== RLS vehiculo =====
CREATE POLICY "vehiculo_select_auth" ON public.vehiculo FOR SELECT TO authenticated USING (true);
CREATE POLICY "vehiculo_admin_all" ON public.vehiculo FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'))
  WITH CHECK (public.has_role(auth.uid(), 'administrador'));

-- ===== RLS viaje =====
CREATE POLICY "viaje_select_auth" ON public.viaje FOR SELECT TO authenticated USING (true);
CREATE POLICY "viaje_insert_auth" ON public.viaje FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "viaje_update_auth" ON public.viaje FOR UPDATE TO authenticated USING (true);
CREATE POLICY "viaje_admin_delete" ON public.viaje FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'));

-- ===== RLS tiquete =====
CREATE POLICY "tiquete_self_select" ON public.tiquete FOR SELECT TO authenticated
  USING (
    persona_id = auth.uid()
    OR public.has_role(auth.uid(), 'administrador')
    OR EXISTS (
      SELECT 1 FROM public.viaje v
      JOIN public.vehiculo ve ON ve.id = v.vehiculo_id
      WHERE v.id = tiquete.viaje_id AND ve.conductor_id = auth.uid()
    )
  );
CREATE POLICY "tiquete_self_insert" ON public.tiquete FOR INSERT TO authenticated
  WITH CHECK (persona_id = auth.uid() OR public.has_role(auth.uid(), 'administrador'));
CREATE POLICY "tiquete_admin_all" ON public.tiquete FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'))
  WITH CHECK (public.has_role(auth.uid(), 'administrador'));

-- ===== RLS notificacion =====
CREATE POLICY "notif_self_select" ON public.notificacion FOR SELECT TO authenticated
  USING (persona_id = auth.uid());
CREATE POLICY "notif_self_insert" ON public.notificacion FOR INSERT TO authenticated
  WITH CHECK (persona_id = auth.uid());
CREATE POLICY "notif_self_update" ON public.notificacion FOR UPDATE TO authenticated
  USING (persona_id = auth.uid());

-- ===== Trigger: crear persona y rol pasajero al registrar usuario =====
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.persona (id, email, nombre, apellido)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre', NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'apellido', '')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.rol (persona_id, rol)
  VALUES (NEW.id, 'pasajero')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== Función atómica para comprar tiquete =====
CREATE OR REPLACE FUNCTION public.comprar_tiquete(_viaje_id UUID, _persona_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cupos INT;
  v_precio NUMERIC;
  v_capacidad INT;
  v_asiento INT;
  v_tiquete_id UUID;
BEGIN
  -- Solo el propio usuario o un admin pueden comprar
  IF auth.uid() <> _persona_id AND NOT public.has_role(auth.uid(), 'administrador') THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT cupos_disponibles, precio, capacidad_total
    INTO v_cupos, v_precio, v_capacidad
  FROM public.viaje WHERE id = _viaje_id FOR UPDATE;

  IF v_cupos IS NULL THEN RAISE EXCEPTION 'Viaje no encontrado'; END IF;
  IF v_cupos <= 0 THEN RAISE EXCEPTION 'Sin cupos disponibles'; END IF;

  v_asiento := v_capacidad - v_cupos + 1;

  INSERT INTO public.tiquete (viaje_id, persona_id, numero_asiento, precio)
  VALUES (_viaje_id, _persona_id, v_asiento, v_precio)
  RETURNING id INTO v_tiquete_id;

  UPDATE public.viaje SET cupos_disponibles = cupos_disponibles - 1
  WHERE id = _viaje_id;

  INSERT INTO public.notificacion (persona_id, titulo, mensaje)
  VALUES (
    _persona_id,
    'Tiquete confirmado',
    'Tu compra fue exitosa. Asiento ' || v_asiento || '. ¡Buen viaje con COTRACIBOL!'
  );

  RETURN v_tiquete_id;
END;
$$;
