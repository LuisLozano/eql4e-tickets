ALTER TABLE "concepto" DROP CONSTRAINT "concepto_nombre_no_otro";--> statement-breakpoint
DROP INDEX "concepto_nombre_unico";--> statement-breakpoint
-- Si ya hay nombres que solo se distinguen por las tildes, al más reciente se le añade su id.
UPDATE "concepto" AS c SET "nombre" = left(c."nombre", 40) || ' (' || c."id" || ')'
WHERE EXISTS (
	SELECT 1 FROM "concepto" AS o
	WHERE o."id" < c."id"
	AND translate(lower(o."nombre"), 'áàâäéèêëíìîïóòôöúùûü', 'aaaaeeeeiiiioooouuuu')
		= translate(lower(c."nombre"), 'áàâäéèêëíìîïóòôöúùûü', 'aaaaeeeeiiiioooouuuu')
);--> statement-breakpoint
CREATE UNIQUE INDEX "concepto_nombre_unico" ON "concepto" USING btree (translate(lower("nombre"), 'áàâäéèêëíìîïóòôöúùûü', 'aaaaeeeeiiiioooouuuu'));--> statement-breakpoint
ALTER TABLE "concepto" ADD CONSTRAINT "concepto_nombre_no_otro" CHECK (translate(lower("concepto"."nombre"), 'áàâäéèêëíìîïóòôöúùûü', 'aaaaeeeeiiiioooouuuu') <> 'otro');