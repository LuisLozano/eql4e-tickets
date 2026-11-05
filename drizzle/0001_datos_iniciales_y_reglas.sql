-- Conceptos iniciales (HU-G04, decisión 11 de los requisitos).
INSERT INTO "concepto" ("nombre", "orden") VALUES
	('Ferretería', 1),
	('Alimentación', 2),
	('Representación', 3),
	('Transporte', 4);
--> statement-breakpoint
-- Historial inmutable (E-01): se rechaza cualquier UPDATE. El DELETE se permite
-- porque la purga (HU-G05) borra los tickets antiguos y su historial en cascada.
CREATE FUNCTION historial_inmutable() RETURNS trigger
	LANGUAGE plpgsql AS $$
BEGIN
	RAISE EXCEPTION 'El historial no se puede modificar (E-01)';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER historial_sin_update
	BEFORE UPDATE ON "historial"
	FOR EACH ROW EXECUTE FUNCTION historial_inmutable();
