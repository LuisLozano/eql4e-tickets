import { z } from 'zod';

// Zod 4 prueba `new Function('')` para saber si puede compilar los validadores. Con la CSP (sin
// 'unsafe-eval') no puede, y el navegador registra el bloqueo: se le dice de entrada que no lo intente.
z.config({ jitless: true });
