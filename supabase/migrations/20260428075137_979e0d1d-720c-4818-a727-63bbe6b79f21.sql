
-- Revocar EXECUTE público y autenticado de funciones SECURITY DEFINER internas
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.comprar_tiquete(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.comprar_tiquete(UUID, UUID) TO authenticated;

-- Reemplazar políticas demasiado permisivas en viaje
DROP POLICY IF EXISTS "viaje_insert_auth" ON public.viaje;
DROP POLICY IF EXISTS "viaje_update_auth" ON public.viaje;

-- Insertar/actualizar viajes solo lo hace la función comprar_tiquete (security definer)
-- o un administrador desde la app
CREATE POLICY "viaje_admin_insert" ON public.viaje FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'administrador'));
CREATE POLICY "viaje_admin_update" ON public.viaje FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'));

-- Función security definer para crear/obtener un viaje (autogeneración por horario)
CREATE OR REPLACE FUNCTION public.obtener_o_crear_viaje(
  _fecha DATE, _hora TIME, _tipo public.tipo_vehiculo
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_capacidad INT;
  v_precio NUMERIC;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;

  SELECT id INTO v_id FROM public.viaje
  WHERE fecha = _fecha AND hora = _hora AND tipo = _tipo
  LIMIT 1;

  IF v_id IS NOT NULL THEN RETURN v_id; END IF;

  IF _tipo = 'taxi' THEN
    v_capacidad := 4; v_precio := 18000;
  ELSE
    v_capacidad := 8; v_precio := 15000;
  END IF;

  INSERT INTO public.viaje (fecha, hora, tipo, capacidad_total, cupos_disponibles, precio)
  VALUES (_fecha, _hora, _tipo, v_capacidad, v_capacidad, v_precio)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.obtener_o_crear_viaje(DATE, TIME, public.tipo_vehiculo) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.obtener_o_crear_viaje(DATE, TIME, public.tipo_vehiculo) TO authenticated;
